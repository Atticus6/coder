import { indentWithTab } from "@codemirror/commands";

import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap } from "@codemirror/view";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";
import { useEffect, useMemo, useRef } from "react";
import { customSetup } from "./extensions/custom-setup";
import { getLanguageExtension } from "./extensions/language-extension";
import { minimap } from "./extensions/minimap";
import { quickEdit } from "./extensions/quick-edit";
// import { quickEdit } from "./extensions/quick-edit";
import { suggestion } from "./extensions/suggestion";
import { customTheme } from "./extensions/theme";

interface Props {
  fileName: string;
  initialValue?: string;
  onChange: (value: string) => void;
}

function CodeEditor({ fileName, initialValue = "", onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const languageExtension = useMemo(() => {
    return getLanguageExtension(fileName);
  }, [fileName]);

  // biome-ignore lint: false
  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView({
      doc: initialValue,
      parent: editorRef.current,
      extensions: [
        oneDark,
        customTheme,
        customSetup,
        languageExtension,
        suggestion(fileName),
        quickEdit(fileName),
        // selectionTooltip(),
        keymap.of([indentWithTab]),
        minimap(),
        indentationMarkers(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
      ],
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [languageExtension]);

  return <div ref={editorRef} className="size-full bg-background" />;
}

export default CodeEditor;
