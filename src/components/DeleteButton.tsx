"use client";

import { useTransition } from "react";

export default function DeleteButton({
  onDelete,
  confirmText,
  label = "Xoá",
  className = "btn-ghost hover:!text-berry",
}: {
  onDelete: () => Promise<void>;
  confirmText: string;
  label?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        if (confirm(confirmText)) start(() => onDelete());
      }}
    >
      {pending ? "…" : label}
    </button>
  );
}
