import { useCallback, useEffect, useState } from "react";
import { useComposeWorkflowStore } from "~/store/use-compose-workflow-store";

interface UseNodeRenameProps {
  id: string;
  initialName: string;
}

export const useNodeRename = ({ id, initialName }: UseNodeRenameProps) => {
  const [name, setName] = useState(initialName);
  const [isRenaming, setIsRenaming] = useState(false);
  const setNodesWithHistory = useComposeWorkflowStore(
    (s) => s.setNodesWithHistory,
  );

  const onNodeRename = useCallback(
    (nodeId: string, name: string, newName: string) => {
      const trimmed = newName.trim();
      if (trimmed.length === 0 || trimmed === name) {
        return;
      }
      setNodesWithHistory((nodes) =>
        nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  label: newName.trim(),
                },
              }
            : node,
        ),
      );
    },
    [setNodesWithHistory],
  );

  useEffect(() => {
    const outsideClickHandler = () => {
      if (isRenaming) {
        setIsRenaming(false);
        onNodeRename(id, initialName, name);
      }
    };
    window.addEventListener("click", outsideClickHandler);
    return () => {
      window.removeEventListener("click", outsideClickHandler);
    };
  }, [initialName, isRenaming, name, onNodeRename, id]);

  if (!isRenaming && name !== initialName) {
    setName(initialName);
  }

  return {
    name,
    setName,
    isRenaming,
    setIsRenaming,
    onNodeRename,
  };
};
