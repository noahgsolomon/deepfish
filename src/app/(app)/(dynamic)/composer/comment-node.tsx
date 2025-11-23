import { NodeProps, NodeResizer } from "@xyflow/react";
import { useComment } from "./hooks/use-comment";
import { Button } from "~/components/ui/button";
import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "~/components/ui/input";

export default function CommentNode(props: NodeProps) {
  const {
    comment: initialComment,
    width,
    height,
    color,
  } = props.data as {
    comment: string;
    width: number;
    height: number;
    color: string;
  };

  const nodeBg = color || "#111111";
  const borderClass = props.selected ? "" : "border";
  const lineClass = props.selected ? "border-rainbow-1" : "";
  const handleClass = props.selected ? "bg-rainbow" : "";

  const { onCommentChange, onCommentResize, onCommentResizeEnd } = useComment();

  const [isEditing, setIsEditing] = useState(false);
  const [comment, setComment] = useState(initialComment);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const outsideClickHandler = () => {
      if (isEditing) {
        setIsEditing(false);
        onCommentChange(props.id, comment);
      }
    };
    window.addEventListener("click", outsideClickHandler);
    return () => {
      window.removeEventListener("click", outsideClickHandler);
    };
  }, [comment, isEditing, onCommentChange, props.id]);

  if (!isEditing && comment !== initialComment) {
    setComment(initialComment);
  }

  return (
    <>
      {props.selected && (
        <NodeResizer
          lineClassName={lineClass}
          handleClassName={handleClass}
          minHeight={100}
          minWidth={150}
          onResize={(_, params) => {
            onCommentResize(props.id, params.width, params.height);
          }}
          onResizeEnd={(_, params) => {
            onCommentResizeEnd(props.id, params.width, params.height);
          }}
        />
      )}
      <div
        className={`group relative flex rounded-none ${borderClass}`}
        style={{
          backgroundColor: nodeBg + "33",
          width,
          height,
          borderColor: nodeBg + "88",
        }}
      >
        <div className="w-full justify-center p-4 text-lg">
          {isEditing ? (
            <Input
              ref={inputRef}
              className="nodrag w-full bg-gray-950/20"
              onChange={(e) => setComment(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              value={comment}
              autoFocus
              draggable={false}
              onKeyDown={(e) => {
                if (e.code === "Enter") {
                  onCommentChange(props.id, comment);
                  setIsEditing(false);
                }
                if (e.code === "Escape") {
                  setComment(initialComment);
                  setIsEditing(false);
                }
              }}
            />
          ) : (
            <>
              {comment}
              <Button
                className="ml-1 hidden h-6 w-6 group-hover:inline-flex"
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                  setTimeout(() => {
                    inputRef.current?.select();
                  });
                }}
              >
                <Pencil />
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
