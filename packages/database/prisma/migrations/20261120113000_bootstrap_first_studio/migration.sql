CREATE SCHEMA pranax_private;
REVOKE ALL ON SCHEMA pranax_private FROM PUBLIC;
GRANT USAGE ON SCHEMA pranax_private TO authenticated;

CREATE OR REPLACE FUNCTION pranax_private.bootstrap_first_studio(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_auth_user_id uuid := auth.uid();
  v_studio_id uuid;
BEGIN
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'An authenticated user is required.' USING ERRCODE = '42501';
  END IF;

  IF p_name IS NULL OR length(btrim(p_name)) = 0 OR length(btrim(p_name)) > 120 THEN
    RAISE EXCEPTION 'Studio name must contain 1 to 120 characters.' USING ERRCODE = '22023';
  END IF;

  -- Serialize bootstrap attempts for this identity, including across pooled connections.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_auth_user_id::text, 0));

  SELECT su."studioId" INTO v_studio_id
  FROM public."StudioUser" AS su
  WHERE su."authUserId" = v_auth_user_id AND su.role = 'OWNER'::public."StudioUserRole"
  ORDER BY su."createdAt", su.id
  LIMIT 1;

  IF v_studio_id IS NOT NULL THEN
    RETURN v_studio_id;
  END IF;

  IF EXISTS (SELECT 1 FROM public."StudioUser" AS su WHERE su."authUserId" = v_auth_user_id) THEN
    RAISE EXCEPTION 'User already belongs to a studio and cannot bootstrap ownership.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public."Studio" (id, name, "updatedAt")
  VALUES (gen_random_uuid(), btrim(p_name), now())
  RETURNING id INTO v_studio_id;
  INSERT INTO public."StudioUser" (id, "studioId", "authUserId", role)
  VALUES (gen_random_uuid(), v_studio_id, v_auth_user_id, 'OWNER'::public."StudioUserRole");

  RETURN v_studio_id;
END;
$$;

REVOKE ALL ON FUNCTION pranax_private.bootstrap_first_studio(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pranax_private.bootstrap_first_studio(text) TO authenticated;
