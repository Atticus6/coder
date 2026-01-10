import { FileIcon } from "@react-symbols/icons/utils";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { orpcClient } from "@/lib/orpc";
import { useEditor } from "./store/use-editor";

export const FileBreadcrumbs = ({ projectId }: { projectId: number }) => {
  const { activeTabId } = useEditor(projectId);

  const { data: filePath } = useQuery(
    orpcClient.file.getPathById.queryOptions({
      input: activeTabId!,
      enabled: !!activeTabId,
    }),
  );

  if (filePath === undefined || !activeTabId) {
    return (
      <div className="border-b bg-background p-2 pl-4">
        <Breadcrumb>
          <BreadcrumbList className="gap-0.5 sm:gap-0.5">
            <BreadcrumbItem className="text-sm">
              <BreadcrumbPage>&nbsp;</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    );
  }

  return (
    <div className="border-b bg-background p-2 pl-4">
      <Breadcrumb>
        <BreadcrumbList className="gap-0.5 sm:gap-0.5">
          {filePath.map((item, index) => {
            const isLast = index === filePath.length - 1;

            return (
              <React.Fragment key={item.id}>
                <BreadcrumbItem className="text-sm">
                  {isLast ? (
                    <BreadcrumbPage className="flex items-center gap-1">
                      <FileIcon
                        fileName={item.name}
                        autoAssign
                        className="size-4"
                      />
                      {item.name}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href="#">{item.name}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};
