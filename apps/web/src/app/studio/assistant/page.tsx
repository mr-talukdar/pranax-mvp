import { AppShell } from '../../../components/shell/AppShell';
import { ConversationalAssistant } from '../../../components/assistant/ConversationalAssistant';

export default function AssistantPage() {
  return (
    <AppShell title="AI Assistant">
      <ConversationalAssistant />
    </AppShell>
  );
}
