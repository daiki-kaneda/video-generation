import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateVideoRequest } from "@video-generation/shared";
import { apiClient } from "../lib/apiClient";
import type { CreateVideoResponse } from "../types/api";

export const useCreateVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateVideoRequest) =>
      apiClient.post<CreateVideoResponse>("/videos", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    },
  });
};
