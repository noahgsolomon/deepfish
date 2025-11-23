import { useCallback } from "react";
import { useComposeWorkflowStore } from "~/store/use-compose-workflow-store";

export const useComment = () => {
  const setNodesSilent = useComposeWorkflowStore((s) => s.setNodesSilent);
  const setNodesWithHistory = useComposeWorkflowStore(
    (s) => s.setNodesWithHistory,
  );

  const onCommentChange = useCallback(
    (nodeId: string, comment: string) => {
      const trimmed = comment.trim();
      if (trimmed.length === 0) {
        return;
      }
      setNodesWithHistory((nodes) =>
        nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  comment: trimmed,
                },
              }
            : node,
        ),
      );
    },
    [setNodesWithHistory],
  );

  const onCommentResize = useCallback(
    (nodeId: string, width: number, height: number) => {
      setNodesSilent((nodes) =>
        nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  width,
                  height,
                },
              }
            : node,
        ),
      );
    },
    [setNodesSilent],
  );

  const onCommentResizeEnd = useCallback(
    (nodeId: string, width: number, height: number) => {
      setNodesWithHistory((nodes) =>
        nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  width,
                  height,
                },
              }
            : node,
        ),
      );
    },
    [setNodesWithHistory],
  );

  return { onCommentChange, onCommentResize, onCommentResizeEnd };
};
