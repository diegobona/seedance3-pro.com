import { t } from './i18n.mjs';
export function createPoseResultActionsController({
  container,
  editButton,
  generateAgainButton,
  onEditPose,
  onGenerateAgain,
}) {
  const handleEdit = () => onEditPose?.();
  const handleGenerateAgain = () => onGenerateAgain?.();
  editButton.addEventListener("click", handleEdit);
  generateAgainButton.addEventListener("click", handleGenerateAgain);

  return {
    setVisible(visible) {
      container.hidden = !visible;
    },
    setGenerateState({ disabled, cost }) {
      generateAgainButton.disabled = Boolean(disabled);
      generateAgainButton.textContent = t('Generate again · {cost} credits', { cost });
    },
    destroy() {
      editButton.removeEventListener("click", handleEdit);
      generateAgainButton.removeEventListener("click", handleGenerateAgain);
    },
  };
}
