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
      generateAgainButton.textContent = `Generate again · ${cost} credits`;
    },
    destroy() {
      editButton.removeEventListener("click", handleEdit);
      generateAgainButton.removeEventListener("click", handleGenerateAgain);
    },
  };
}
