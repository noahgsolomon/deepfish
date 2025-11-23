"use client";

import React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Selector } from "~/components/ui/selector";
import { Slider } from "~/components/ui/slider";
import { Switch } from "~/components/ui/switch";
import { X, Plus } from "lucide-react";
import AudioPlayer from "./audio-player";
import { useToast } from "~/hooks/use-toast";
import UploadSquare from "~/components/icons/upload-square";
import { Button } from "~/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/client";
import { upload as uploadToBlob } from "@vercel/blob/client";
import { useDrop } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";
import OneTimePassword from "~/components/one-time-password";

export interface InputFieldType {
  name: string;
  type:
    | "image"
    | "video"
    | "audio"
    | "text"
    | "number"
    | "select"
    | "checkbox"
    | "slider"
    | "color"
    | "image_array";
  label: string;
  placeholder?: string;
  helperText?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  defaultValue?: any;
  savedValue?: string;
  format?: string;
}

export interface SchemaProperty {
  type: string;
  format?: string;
  title: string;
  description?: string;
  default?: any;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  "x-order"?: number;
  items?: {
    type: string;
    format?: string;
  };
  saved?: string;
}

const InputField = function InputField({
  field,
  inputs,
  setInputsAction,
  workflowTitle = "",
}: {
  field: InputFieldType;
  inputs: Record<string, any>;
  setInputsAction: (value: Record<string, any>) => void;
  workflowTitle?: string;
}) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const uploadedValuesRef = useRef<Set<string>>(new Set());
  const uploadingValuesRef = useRef<Set<string>>(new Set());
  const processedValuesRef = useRef<Set<string>>(new Set());
  const trpc = useTRPC();
  const dropRef = useRef<HTMLDivElement>(null);
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: [NativeTypes.FILE],
      drop: (item: { files: any[] }) => {
        const file = item.files?.[0];
        if (file) {
          if (file.type.startsWith("image/")) {
            handleFileUpload(field.name, file);
          } else {
            toast({
              title: "Invalid file type",
              description: "Please select an image file.",
              variant: "destructive",
            });
          }
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [],
  );
  drop(dropRef);

  // Deprecated: base64 -> tRPC -> server upload. We now upload directly to Blob from client
  // const uploadImage = useMutation(trpc.upload.uploadImage.mutationOptions());

  const isBase64DataURL = useCallback((str: string): boolean => {
    if (!str || typeof str !== "string") return false;
    return str.startsWith("data:") && str.includes("base64,");
  }, []);

  const uploadBase64Data = useCallback(
    async (base64Data: string): Promise<string> => {
      // Check if we're already uploading this exact data
      if (uploadingValuesRef.current.has(base64Data)) {
        return base64Data;
      }

      // Check if we've already uploaded this data before
      if (uploadedValuesRef.current.has(base64Data)) {
        return base64Data;
      }

      // Mark as uploading
      uploadingValuesRef.current.add(base64Data);
      setIsUploading(true);

      try {
        // Convert base64 to Blob on the client and upload directly to Vercel Blob
        const [meta, data] = base64Data.split(",", 2);
        const contentTypeMatch = meta?.match(/data:([^;]+)/);
        const contentType = contentTypeMatch
          ? contentTypeMatch[1]
          : "application/octet-stream";
        const binary = atob(data || "");
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const fileBlob = new Blob([bytes], { type: contentType });

        const fileName = `inputs-${Date.now()}`;
        const putResult = await uploadToBlob(fileName, fileBlob, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
        });

        uploadedValuesRef.current.add(base64Data);
        return putResult.url;
      } catch (error) {
        console.error("[InputField] Failed to upload base64 data:", error);

        toast({
          title: "Upload failed",
          description:
            "Failed to upload file to cloud storage. Using local data.",
          variant: "destructive",
          duration: 3000,
        });

        return base64Data;
      } finally {
        uploadingValuesRef.current.delete(base64Data);
        setIsUploading(uploadingValuesRef.current.size > 0);
      }
    },
    [toast],
  );

  const handleInputChange = useCallback(
    (name: string, value: any) => {
      setInputsAction((prev: Record<string, any>) => ({
        ...prev,
        [name]: value,
      }));
    },
    [setInputsAction],
  );

  useEffect(() => {
    if (field.savedValue) {
      setInputsAction((prev: Record<string, any>) => ({
        ...prev,
        [field.name]: field.savedValue,
      }));
    }
  }, [field.savedValue, field.name, setInputsAction]);

  // Effect to upload base64 data when inputs change
  useEffect(() => {
    const value = inputs[field.name];

    // Skip if no value or if it's already a URL
    if (!value || (typeof value === "string" && value.startsWith("http"))) {
      return;
    }

    // Skip if we've already processed this exact value for this field
    const valueKey = `${field.name}:${JSON.stringify(value)}`;
    if (processedValuesRef.current.has(valueKey)) {
      return;
    }

    const uploadIfNeeded = async () => {
      // Mark this value as being processed
      processedValuesRef.current.add(valueKey);

      // Handle single media values
      if (typeof value === "string" && isBase64DataURL(value)) {
        const shouldUpload = ["image", "video", "audio"].includes(field.type);

        if (shouldUpload) {
          const uploadedUrl = await uploadBase64Data(value);

          // Only update if we got a different URL back (successful upload)
          if (uploadedUrl !== value && uploadedUrl.startsWith("http")) {
            handleInputChange(field.name, uploadedUrl);
          }
        }
      }

      // Handle image arrays
      if (field.type === "image_array" && Array.isArray(value)) {
        const updatedArray = [...value];
        let hasChanges = false;

        // Process each item in the array
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          if (item && typeof item === "string" && isBase64DataURL(item)) {
            const uploadedUrl = await uploadBase64Data(item);
            if (uploadedUrl !== item && uploadedUrl.startsWith("http")) {
              updatedArray[i] = uploadedUrl;
              hasChanges = true;
            }
          }
        }

        // Update the array if any items were uploaded
        if (hasChanges) {
          handleInputChange(field.name, updatedArray);
        }
      }
    };

    uploadIfNeeded();
  }, [
    inputs,
    field.name,
    field.type,
    uploadBase64Data,
    isBase64DataURL,
    handleInputChange,
  ]);

  const handleImageArrayChange = (
    name: string,
    index: number,
    value: string | null,
  ) => {
    setInputsAction((prev: Record<string, any>) => {
      const currentArray =
        prev && prev[name] && Array.isArray(prev[name]) ? [...prev[name]] : [];

      if (value === null) {
        return {
          ...prev,
          [name]: currentArray.filter((_, i) => i !== index),
        };
      } else if (index === currentArray.length) {
        return {
          ...prev,
          [name]: [...currentArray, value],
        };
      } else {
        const newArray = [...currentArray];
        newArray[index] = value;
        return {
          ...prev,
          [name]: newArray,
        };
      }
    });
  };

  const handleFileUpload = async (
    name: string,
    file?: File,
    index?: number,
  ) => {
    if (!file) return;

    const nm = name.toLowerCase();
    const expectedType =
      nm.includes("video") || field.type === "video"
        ? "video/"
        : field.type === "audio" ||
            nm.includes("audio") ||
            nm.includes("song") ||
            nm.includes("voice") ||
            nm.includes("instrumental") ||
            nm.includes("music") ||
            nm.includes("sound") ||
            nm.includes("track") ||
            nm.includes("beat") ||
            nm.includes("vocal")
          ? "audio/"
          : "image/";

    if (!file.type.startsWith(expectedType)) {
      const fileTypeName = expectedType.replace("/", "");
      toast({
        title: `Invalid file type`,
        description: `Please select a ${fileTypeName} file.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      // Upload the File directly to Vercel Blob
      const putResult = await uploadToBlob(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
      });

      const finalValue = putResult.url;
      if (typeof index === "number") {
        handleImageArrayChange(name, index, finalValue);
      } else {
        handleInputChange(name, finalValue);
      }
    } catch (err) {
      console.error("Direct upload failed", err);
      toast({
        title: "Upload failed",
        description: "Failed to upload file to cloud storage.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const renderField = () => {
    switch (field.type) {
      case "image_array":
        return (
          <div className="mb-4" key={field.name}>
            <label className="mb-1 block font-mono text-xs font-bold">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {field.helperText && (
              <p className="text-text-secondary mb-2 font-mono text-[10px]">
                {field.helperText}
              </p>
            )}

            <div className="space-y-2">
              {Array.isArray(inputs[field.name]) &&
                inputs[field.name].map((imgSrc: string, idx: number) => (
                  <div key={`${field.name}-${idx}`} className="group relative">
                    <img
                      src={imgSrc}
                      alt={`${field.label} ${idx + 1}`}
                      className="border-border-default mx-auto max-h-[12vh] w-full rounded-none border object-contain"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageArrayChange(field.name, idx, null);
                      }}
                      className="absolute top-0 right-0 z-20 rounded-none bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X size={12} className="text-white" />
                    </button>
                    <label className="nodrag absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/70 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex flex-col items-center">
                        <UploadSquare
                          size={18}
                          className="text-text-emphasis mb-1"
                        />
                        <span className="text-text-emphasis font-mono text-[10px]">
                          Replace
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileUpload(
                              field.name,
                              e.target.files?.[0],
                              idx,
                            )
                          }
                        />
                      </div>
                    </label>
                  </div>
                ))}

              <div className="nodrag border-border-default bg-surface-primary hover:bg-surface-secondary rounded-none border p-4 text-center transition-colors">
                <label className="flex cursor-pointer flex-col items-center">
                  <Plus size={20} className="text-text-muted mb-1" />
                  <span className="text-text-secondary font-mono text-xs">
                    Add Image
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const currentLength = Array.isArray(inputs[field.name])
                        ? inputs[field.name].length
                        : 0;
                      handleFileUpload(
                        field.name,
                        e.target.files?.[0],
                        currentLength,
                      );
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        );

      case "image":
        return (
          <div className="mb-4" key={field.name}>
            <label className="mb-1 block font-mono text-xs font-bold">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {field.helperText && (
              <p className="text-text-secondary mb-2 font-mono text-[10px]">
                {field.helperText}
              </p>
            )}

            {/* Toggle buttons for upload or URL */}

            <div className="nodrag mb-2 flex gap-2">
              <input
                type="text"
                placeholder="Enter image URL (https://...)"
                value={
                  inputs[field.name] && !inputs[field.name].startsWith("data:")
                    ? inputs[field.name]
                    : ""
                }
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                className="bg-surface-primary border-border-default w-full rounded-none border p-2 font-mono text-xs text-white ring-0 outline-none"
              />
              <Button onClick={() => handleInputChange(field.name, undefined)}>
                Clear
              </Button>
            </div>

            {inputs[field.name] ? (
              <div ref={dropRef} className="group relative">
                {inputs[field.name].startsWith("data:") ||
                inputs[field.name].startsWith("http") ? (
                  <img
                    src={inputs[field.name]}
                    alt={field.label}
                    className="border-border-default mx-auto max-h-[25vh] w-full rounded-none border object-contain"
                    onError={() => {
                      // Only show error for URLs, not data URIs
                      if (inputs[field.name].startsWith("http")) {
                        toast({
                          title: "Image Error",
                          description: "Failed to load image from URL",
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                ) : (
                  <div className="border-border-default bg-surface-primary flex h-[25vh] w-full items-center justify-center border">
                    <span className="text-text-secondary text-xs">
                      Using URL: {inputs[field.name].substring(0, 50)}...
                    </span>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInputChange(field.name, undefined);
                  }}
                  className="absolute top-0 right-0 z-20 rounded-none p-1 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
                <label
                  className={`${isOver ? "opacity-100" : "opacity-0"} nodrag absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/70 transition-opacity group-hover:opacity-100`}
                >
                  <div className="flex flex-col items-center">
                    <UploadSquare
                      size={24}
                      className="text-text-emphasis mb-2"
                    />
                    <span className="text-text-emphasis font-mono text-xs">
                      {isOver ? "Drop" : "Click"} to Replace
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.type.startsWith("image/")) {
                            handleFileUpload(field.name, e.target.files?.[0]);
                          } else {
                            e.target.value = "";
                            toast({
                              title: "Invalid file type",
                              description: "Please select an image file.",
                              variant: "destructive",
                            });
                          }
                        }
                      }}
                    />
                  </div>
                </label>
              </div>
            ) : (
              <div
                ref={dropRef}
                className={`${isOver ? "bg-surface-secondary" : "bg-surface-primary"} nodrag border-border-default hover:bg-surface-secondary rounded-none border p-6 text-center transition-colors`}
              >
                <label className="flex cursor-pointer flex-col items-center">
                  <UploadSquare size={24} className="text-text-muted mb-2" />
                  <span className="text-text-secondary font-mono text-xs">
                    Upload Image or Enter URL Above
                  </span>
                  {isUploading && (
                    <span className="mt-1 font-mono text-xs text-blue-400">
                      Uploading to cloud...
                    </span>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.type.startsWith("image/")) {
                          handleFileUpload(field.name, e.target.files?.[0]);
                        } else {
                          e.target.value = "";
                          toast({
                            title: "Invalid file type",
                            description: "Please select an image file.",
                            variant: "destructive",
                          });
                        }
                      }
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        );

      case "video":
        return (
          <div className="mb-4" key={field.name}>
            <label className="mb-1 block font-mono text-xs font-bold">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {field.helperText && (
              <p className="text-text-secondary mb-2 font-mono text-[10px]">
                {field.helperText}
              </p>
            )}

            {inputs[field.name] ? (
              <div className="group relative">
                <video
                  src={inputs[field.name]}
                  controls
                  className="border-border-default mx-auto max-h-[25vh] w-full rounded-none border object-contain"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInputChange(field.name, undefined);
                  }}
                  className="absolute top-0 right-0 z-20 rounded-none p-1 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="nodrag border-border-default bg-surface-primary hover:bg-surface-secondary rounded-none border p-6 text-center transition-colors">
                <label className="flex cursor-pointer flex-col items-center">
                  <UploadSquare size={24} className="text-text-muted mb-2" />
                  <span className="text-text-secondary font-mono text-xs">
                    Upload Video
                  </span>
                  {isUploading && (
                    <span className="mt-1 font-mono text-xs text-blue-400">
                      Uploading to cloud...
                    </span>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.type.startsWith("video/")) {
                          handleFileUpload(field.name, e.target.files?.[0]);
                        } else {
                          e.target.value = "";
                          toast({
                            title: "Invalid file type",
                            description: "Please select a video file.",
                            variant: "destructive",
                          });
                        }
                      }
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        );

      case "audio":
        return (
          <div className="mb-4" key={field.name}>
            <label className="mb-1 block font-mono text-xs font-bold">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {field.helperText && (
              <p className="text-text-secondary mb-2 font-mono text-[10px]">
                {field.helperText}
              </p>
            )}

            {inputs[field.name] ? (
              <div className="group relative">
                <div className="border-border-default group w-full rounded-none border p-3">
                  <AudioPlayer audioSrc={inputs[field.name]} />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInputChange(field.name, undefined);
                  }}
                  className="border-border-default absolute top-0 right-0 z-20 rounded-none border bg-black/70 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="nodrag border-border-default bg-surface-primary hover:bg-surface-secondary rounded-none border p-6 text-center transition-colors">
                <label className="flex cursor-pointer flex-col items-center">
                  <UploadSquare size={24} className="text-text-muted mb-2" />
                  <span className="text-text-secondary font-mono text-xs">
                    Upload Audio
                  </span>
                  {isUploading && (
                    <span className="mt-1 font-mono text-xs text-blue-400">
                      Uploading to cloud...
                    </span>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.type.startsWith("audio/")) {
                          handleFileUpload(field.name, e.target.files?.[0]);
                        } else {
                          e.target.value = "";
                          toast({
                            title: "Invalid file type",
                            description: "Please select an audio file.",
                            variant: "destructive",
                          });
                        }
                      }
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        );

      case "text":
        const isPasswordField = field.format === "password";

        return (
          <div className="mb-4" key={field.name}>
            <label className="mb-1 block font-mono text-xs font-bold">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {field.helperText && (
              <p className="text-text-secondary mb-2 font-mono text-[10px]">
                {field.helperText}
              </p>
            )}
            <div
              className={`${
                field.name.toLowerCase().includes("_key") ? "flex gap-2" : ""
              }`}
            >
              {isPasswordField ? (
                <input
                  type="password"
                  value={inputs[field.name] || ""}
                  onChange={(e) =>
                    handleInputChange(field.name, e.target.value)
                  }
                  placeholder={field.placeholder}
                  className="nodrag bg-surface-primary border-border-default w-full rounded-none border p-2 font-mono text-xs text-white ring-0 outline-none"
                />
              ) : (
                <textarea
                  value={inputs[field.name] || ""}
                  onChange={(e) =>
                    handleInputChange(field.name, e.target.value)
                  }
                  placeholder={field.placeholder}
                  className="nodrag nowheel bg-surface-primary border-border-default h-32 w-full rounded-none border p-2 text-xs text-white ring-0 outline-none"
                />
              )}
            </div>
          </div>
        );

      case "number":
        return (
          <div className="mb-4" key={field.name}>
            <label className="mb-1 block font-mono text-xs font-bold">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {field.helperText && (
              <p className="text-text-secondary mb-2 font-mono text-[10px]">
                {field.helperText}
              </p>
            )}
            <input
              type="number"
              value={inputs[field.name] || ""}
              onChange={(e) => {
                const value =
                  e.target.value === ""
                    ? ""
                    : field.name === "seed" || field.step === 1
                      ? Number.parseInt(e.target.value)
                      : Number.parseFloat(e.target.value);
                handleInputChange(field.name, value);
              }}
              placeholder={`Enter ${
                field.step === 1 ? "an integer" : "a number"
              }`}
              step={field.step || 1}
              className="nodrag bg-surface-primary border-border-default w-full rounded-none border p-2 font-mono text-xs text-white ring-0 outline-none"
            />
          </div>
        );

      case "slider":
        return (
          <div className="mb-4" key={field.name}>
            <div className="mb-1 flex items-center justify-between">
              <label className="block font-mono text-xs font-bold">
                {field.label}
                {field.required && <span className="ml-1 text-red-500">*</span>}
              </label>
              <span className="text-text-emphasis font-mono text-xs">
                {inputs[field.name] !== undefined
                  ? field.step === 0.1
                    ? Number(inputs[field.name]).toFixed(1)
                    : inputs[field.name]
                  : field.defaultValue !== undefined
                    ? field.step === 0.1
                      ? Number(field.defaultValue).toFixed(1)
                      : field.defaultValue
                    : field.min}
              </span>
            </div>
            {field.helperText && (
              <p className="text-text-secondary mb-2 font-mono text-[10px]">
                {field.helperText}
              </p>
            )}
            <div className="py-4">
              <Slider
                value={[
                  inputs[field.name] !== undefined
                    ? inputs[field.name]
                    : field.defaultValue !== undefined
                      ? field.defaultValue
                      : field.min || 0,
                ]}
                onValueChange={(value) =>
                  handleInputChange(field.name, value[0])
                }
                min={field.min || 0}
                max={field.max || 100}
                step={field.step || 1}
                className="w-full"
              />
            </div>
            <div className="text-text-muted mt-1 flex justify-between font-mono text-[10px]">
              <span>{field.min || 0}</span>
              <span>{field.max || 100}</span>
            </div>
          </div>
        );

      case "select":
        const isMulti = Array.isArray(field.defaultValue);
        return (
          <div className="mb-4" key={field.name}>
            <label className="mb-1 block font-mono text-xs font-bold">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {field.helperText && (
              <p className="text-text-secondary mb-2 font-mono text-[10px]">
                {field.helperText}
              </p>
            )}
            <Selector
              value={
                inputs[field.name] !== undefined
                  ? inputs[field.name]
                  : field.defaultValue !== undefined
                    ? field.defaultValue
                    : isMulti
                      ? []
                      : ""
              }
              onChange={(value) => handleInputChange(field.name, value)}
              items={
                field.options?.map((option) => ({
                  id: option,
                  name: option,
                  value: option,
                })) || []
              }
              multiSelect={isMulti}
              className="nodrag"
            />
          </div>
        );

      case "checkbox":
        return (
          <div className="mb-4" key={field.name}>
            <div className="flex items-center justify-between">
              <div>
                <label
                  htmlFor={field.name}
                  className="font-mono text-xs font-bold"
                >
                  {field.label}
                  {field.required && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </label>
                {field.helperText && (
                  <p className="text-text-secondary mt-1 font-mono text-[10px]">
                    {field.helperText}
                  </p>
                )}
              </div>

              <Switch
                id={field.name}
                checked={!!inputs[field.name]}
                onCheckedChange={(checked) =>
                  handleInputChange(field.name, checked)
                }
                className="data-[state=unchecked]:bg-surface-accent data-[state=checked]:bg-blue-500"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return <>{renderField()}</>;
};

export default InputField;
