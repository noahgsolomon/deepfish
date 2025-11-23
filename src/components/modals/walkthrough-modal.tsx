"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogPortal, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { ChevronRight, Terminal, Keyboard } from "lucide-react";
import DeepFishIllustration from "./deepfish-illustration";
import WorkflowImportIllustration from "./workflow-import-illustration";
import FlowIllustration from "./flow-illustration";
import CommandsModal from "./commands-modal";
import { useUpdateUser, useUser } from "~/hooks/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { User } from "~/types";

interface WalkthroughModalProps {
  open: boolean;
}

const WORKFLOW_COMMANDS = [
  { keys: ["⌘", "Enter"], description: "Run workflow" },
];

const COMPOSER_COMMANDS = [
  { keys: ["⌘", "Enter"], description: "Run flow" },
  { keys: ["⌘", "A"], description: "Add node" },
  { keys: ["⌘", "C"], description: "Copy selected nodes" },
  { keys: ["⌘", "V"], description: "Paste copied nodes" },
  { keys: ["⌘", "S"], description: "Save flow" },
  { keys: ["⌘", "X"], description: "Cut nodes" },
  { keys: ["⌘", "Z"], description: "Undo" },
  { keys: ["⌘", "Shift", "Z"], description: "Redo" },
];

const WALKTHROUGH_SLIDES = [
  {
    title: "Welcome to Deep Fish",
    content:
      "Your all-in-one platform to build, run, and explore the latest in generative AI workflows.",
    type: "image",
    url: "https://cwp8pb7l7rzz6iyv.public.blob.vercel-storage.com/tmp3efddtbr-ICMdjMoolFe72vkKfP12SItDF4iYml.png",
  },
  {
    title: "What is Deep Fish?",
    content:
      "DeepFish brings together AI infrastructure from Fal and Replicate, providing you with seamless access to powerful workflows and AI applications—all within a single, unified platform.",
    type: "component",
    component: "deepfish-illustration",
  },
  {
    title: "Import from Anywhere",
    content:
      "Add workflows instantly. Paste a Fal or Replicate link, or upload a ComfyUI JSON file. Deep Fish handles the rest, giving you a unified workflow library.",
    type: "component",
    component: "workflow-import",
  },
  {
    title: "Flows",
    content:
      "Flows are what make DeepFish unique. They let you build AI workflows by combining multiple smaller workflows together.",
    type: "component",
    component: "flow-illustration",
  },
  {
    title: "Workflows",
    content:
      "Add workflows from Fal or Replicate with just a link, and run any of DeepFish's featured workflows with a click of a button.",
    type: "video",
    url: "/deepfishworkflows.mp4",
    hasCommands: true,
  },
  {
    title: "Composer",
    content: "Composer is where you create and run your Flows.",
    type: "video",
    url: "/deepfishcomposer.mp4",
    hasCommands: true,
  },
];

export default function WalkthroughModal({ open }: WalkthroughModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showCommandsModal, setShowCommandsModal] = useState(false);
  const isLastSlide = currentSlide === WALKTHROUGH_SLIDES.length - 1;
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const updateUser = useUpdateUser({
    onMutate: ({ completedWalkthrough }) => {
      queryClient.setQueryData<User>(trpc.user.getUser.queryKey(), (old) => {
        if (!old) return old;
        return {
          ...old,
          completedWalkthrough: !!completedWalkthrough,
        };
      });
    },
  });

  const handleNext = () => {
    if (isLastSlide) {
      updateUser.mutate({ completedWalkthrough: true });
    } else {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const goToSlide = (slideIndex: number) => {
    setCurrentSlide(slideIndex);
  };

  const slide = WALKTHROUGH_SLIDES[currentSlide];

  // Determine which commands to show based on current slide
  const getCommandsForSlide = () => {
    if (slide.title === "Workflows") return WORKFLOW_COMMANDS;
    if (slide.title === "Composer") return COMPOSER_COMMANDS;
    return [];
  };

  return (
    <>
      <Dialog modal={false} open={open} onOpenChange={() => {}}>
        <DialogPortal>
          <DialogTitle className="hidden">System Initialization</DialogTitle>
          <div className="fixed inset-0 z-[100] bg-black/80" />
          <DialogContent
            showX={false}
            className="border-border-default bg-surface-primary z-[101] w-[400px] max-w-[90vw] gap-0 overflow-hidden rounded-none border p-0 shadow-none"
          >
            {/* Terminal Header */}
            <div className="bg-surface-elevated border-border-default flex items-center justify-between border-b px-3 py-2">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-white" />
                <span className="font-mono text-xs text-white">
                  DEEPFISH_WALKTHROUGH
                </span>
                <div className="text-xs text-red-500">[BETA]</div>
              </div>
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-red-500/60" />
                <div className="h-2 w-2 rounded-full bg-yellow-500/60" />
                <div className="h-2 w-2 rounded-full bg-green-500/60" />
              </div>
            </div>

            <div className="space-y-4 p-4">
              {/* Slide Content - Fixed Height Container */}
              <div className="flex flex-col space-y-4">
                {/* Media Section - Fixed Height */}
                <div
                  className={`relative flex w-full items-center justify-center bg-black ${
                    slide.type === "video" ? "min-h-[200px]" : ""
                  }`}
                >
                  {slide.type === "video" && (
                    <video
                      key={slide.url}
                      src={slide.url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="border-border-default h-full w-full border object-contain"
                    />
                  )}
                  {slide.type === "image" && (
                    <img
                      src={slide.url}
                      alt={slide.title}
                      className="border-border-default h-full w-full border object-cover"
                    />
                  )}
                  {slide.type === "component" &&
                    slide.component === "deepfish-illustration" && (
                      <DeepFishIllustration />
                    )}
                  {slide.type === "component" &&
                    slide.component === "workflow-import" && (
                      <WorkflowImportIllustration />
                    )}
                  {slide.type === "component" &&
                    slide.component === "flow-illustration" && (
                      <FlowIllustration />
                    )}
                </div>

                {/* Text Content - Flex to fill remaining space */}
                <div className="flex flex-1 flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="font-mono text-lg font-bold text-white">
                      {slide?.title.toUpperCase()}
                    </h2>
                    {slide.hasCommands && (
                      <Button
                        onClick={() => setShowCommandsModal(true)}
                        className="border-border-default flex h-auto items-center gap-1.5 rounded-none border bg-white/10 px-2 py-1 font-mono text-xs text-white hover:bg-white/20"
                      >
                        <Keyboard size={12} />
                        SHORTCUTS
                      </Button>
                    )}
                  </div>
                  <p className="text-text-default font-mono text-xs leading-relaxed">
                    {slide?.content}
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <div className="border-border-subtle flex items-center justify-between border-t pt-4">
                {/* Progress Indicator */}
                <div className="flex items-center gap-2">
                  <span className="text-text-muted font-mono text-xs">
                    [{currentSlide + 1}/{WALKTHROUGH_SLIDES.length}]
                  </span>
                  <div className="flex gap-1">
                    {WALKTHROUGH_SLIDES.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`h-1.5 transition-all duration-200 ${
                          index === currentSlide
                            ? "w-4 bg-white"
                            : "w-1.5 bg-white/20 hover:bg-white/30"
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Next/Done Button */}
                <Button
                  onClick={handleNext}
                  className="border-border-default flex items-center gap-2 rounded-none border bg-white/10 px-4 py-1.5 font-mono text-xs text-white transition-all duration-150 hover:bg-white/20"
                >
                  {isLastSlide ? "DONE" : "CONTINUE"}
                  <ChevronRight size={12} />
                </Button>
              </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      {/* Commands Modal */}
      <CommandsModal
        open={showCommandsModal}
        onClose={() => setShowCommandsModal(false)}
        commands={getCommandsForSlide()}
        title={slide.title}
      />
    </>
  );
}
