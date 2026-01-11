import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import {
  CopyIcon,
  HistoryIcon,
  LoaderIcon,
  PlusIcon,
  Trash,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
// import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { client, orpcClient } from "@/lib/orpc";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "./ai-elements/message";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export const ConversationSidebar = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const projectId = useParams({
    strict: false,
    select(params) {
      return Number(params.projectId);
    },
  });

  const { conversationId: selectedConversationId } = useSearch({
    strict: false,
  });

  const setSelectedConversationId = useCallback(
    (id: number | null) => {
      navigate({
        to: "/projects/$projectId",
        params: { projectId: String(projectId) },
        search: { conversationId: id ?? undefined },
        replace: true,
      });
    },
    [navigate, projectId],
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [input, setInput] = useState("");
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const isNewConversationRef = useRef(false);

  // 获取当前对话
  const { data: conversation, refetch: refetchConversation } = useQuery(
    orpcClient.conversation.getById.queryOptions({
      input: selectedConversationId!,
      enabled: !!selectedConversationId,
    }),
  );

  // 流式获取workflow输出
  useEffect(() => {
    if (!currentRunId) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchStream = async () => {
      try {
        const response = await fetch(`/api/chat/${currentRunId}/stream`, {
          signal: abortController.signal,
          headers: {
            Accept: "text/event-stream",
          },
        });
        if (!response.ok || !response.body) {
          throw new Error("Failed to fetch stream");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done || abortController.signal.aborted) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "text-delta" && parsed.delta) {
                  setStreamingContent((prev) => prev + parsed.delta);
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
        // 流结束后刷新对话
        setCurrentRunId(null);
        setStreamingContent("");
        refetchConversation();
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Stream error:", error);
          setCurrentRunId(null);
          setStreamingContent("");
          refetchConversation();
        }
      }
    };

    fetchStream();

    return () => {
      abortController.abort();
      abortControllerRef.current = null;
    };
  }, [currentRunId, refetchConversation]);

  // 获取对话历史列表
  const { data: conversationList } = useQuery(
    orpcClient.ai.getConversationList.queryOptions({
      input: { projectId: projectId! },
      enabled: !!projectId,
      select(data) {
        // 只有在非新建对话模式下，才自动选中第一个
        if (
          !selectedConversationId &&
          data.length &&
          !isNewConversationRef.current
        ) {
          setSelectedConversationId(data[0].id);
        }
        return data;
      },
    }),
  );

  // 发送消息mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!projectId) throw new Error("Project ID is required");
      return client.ai.sendMessage({
        message,
        projectId,
        conversationId: selectedConversationId ?? undefined,
      });
    },
    onSuccess: (data) => {
      isNewConversationRef.current = false;
      setSelectedConversationId(data.conversationId);
      setCurrentRunId(data.runId);
      setStreamingContent("");
      setInput("");
      // 刷新对话内容
      refetchConversation();
      // 刷新对话列表
      queryClient.invalidateQueries({
        queryKey: orpcClient.ai.getConversationList.queryOptions({
          input: { projectId: projectId! },
        }).queryKey,
      });
    },
    onError: (error) => {
      toast.error("Failed to send", {
        description: error.message,
      });
    },
  });

  const handleSubmit = useCallback(
    async (msg: PromptInputMessage) => {
      if (!msg.text?.trim()) return;
      sendMessageMutation.mutate(msg.text);
    },
    [sendMessageMutation],
  );

  const handleNewConversation = () => {
    // 取消当前流
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    isNewConversationRef.current = true;
    setSelectedConversationId(null);
    setCurrentRunId(null);
    setStreamingContent("");
    setInput("");
  };

  const handleSelectConversation = (id: number) => {
    isNewConversationRef.current = false;
    setSelectedConversationId(id);
    setHistoryOpen(false);
  };

  // 删除对话mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (id: number) => {
      return client.conversation.deleteById(id);
    },
    onSuccess: (_, deletedId) => {
      // 清除被删除对话的缓存
      queryClient.removeQueries({
        queryKey: orpcClient.conversation.getById.queryOptions({
          input: deletedId,
        }).queryKey,
      });
      // 重置状态
      isNewConversationRef.current = false;
      setSelectedConversationId(null);
      // 刷新对话列表
      queryClient.invalidateQueries({
        queryKey: orpcClient.ai.getConversationList.queryOptions({
          input: { projectId: projectId! },
        }).queryKey,
      });
    },
    onError: (error) => {
      toast.error("Deletion failed", {
        description: error.message,
      });
    },
  });

  const handleDeleteConversation = useCallback(() => {
    if (!selectedConversationId) return;
    deleteConversationMutation.mutate(selectedConversationId);
  }, [selectedConversationId, deleteConversationMutation]);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-8.75 items-center justify-between border-b">
        <div className="truncate pl-3 text-sm">
          {conversation?.title || "New conversation"}
        </div>
        <div className="flex items-center gap-1 px-1">
          {selectedConversationId && (
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={handleDeleteConversation}
              disabled={deleteConversationMutation.isPending}
            >
              <Trash className="size-3.5" />
            </Button>
          )}

          <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
            <PopoverTrigger asChild>
              <Button size="icon-xs" variant="ghost">
                <HistoryIcon className="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              <div className="font-medium text-muted-foreground text-xs">
                historical conversations
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {conversationList?.length ? (
                  conversationList.map((conv) => (
                    <button
                      type="button"
                      key={conv.id}
                      className="w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => handleSelectConversation(conv.id)}
                    >
                      {conv.title}
                    </button>
                  ))
                ) : (
                  <div className="py-2 text-center text-muted-foreground text-xs">
                    No historical conversations available
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleNewConversation}
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </div>
      </div>
      <Conversation className="flex-1">
        <ConversationContent>
          {(conversation?.messages || []).length > 0 ? (
            (conversation?.messages || []).map((message, messageIndex) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.status === "processing" ? (
                    streamingContent ? (
                      <MessageResponse>{streamingContent}</MessageResponse>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <LoaderIcon className="size-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    )
                  ) : (
                    <MessageResponse>{message.content}</MessageResponse>
                  )}
                </MessageContent>

                {message.role === "assistant" &&
                  message.status === "completed" &&
                  messageIndex === (conversation?.messages.length ?? 0) - 1 && (
                    <MessageActions>
                      <MessageAction
                        onClick={() => {
                          navigator.clipboard.writeText(message.content);
                          toast.success("已复制到剪贴板");
                        }}
                        label="Copy"
                      >
                        <CopyIcon className="size-3" />
                      </MessageAction>
                    </MessageActions>
                  )}
              </Message>
            ))
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <span className="text-sm">
                Start a new conversation and ask AI questions
              </span>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="p-3">
        <PromptInput
          className="mt-2"
          onSubmit={handleSubmit}
          // isLoading={sendMessageMutation.isPending}
        >
          <PromptInputBody>
            <PromptInputTextarea
              placeholder="Ask Coder anything..."
              onChange={(e) => setInput(e.target.value)}
              value={input}
              disabled={sendMessageMutation.isPending}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit disabled={sendMessageMutation.isPending} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};
