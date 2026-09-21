import type { YoutubeVideo } from "@/lib/types";

type YoutubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      publishedAt?: string;
      thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
    };
  }>;
};

// aceita somente imagens HTTP(S) para não renderizar protocolos perigosos na interface.
function safeThumbnail(url: string | undefined, videoId: string) {
  if (url?.startsWith("https://") || url?.startsWith("http://")) {
    return url;
  }
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function mapYoutubeSearchResponse(response: YoutubeSearchResponse): YoutubeVideo[] {
  // normaliza a resposta externa para o contrato usado pela interface.
  return (response.items ?? []).flatMap((item) => {
    const id = item.id?.videoId;
    const snippet = item.snippet;
    if (!id || !snippet?.title?.trim()) {
      return [];
    }
    return [{
      id,
      title: snippet.title.trim(),
      channel: snippet.channelTitle?.trim() || "Canal não informado",
      description: snippet.description?.trim() || "Sem descrição disponível.",
      publishedAt: snippet.publishedAt,
      thumbnailUrl: safeThumbnail(snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url, id),
      videoUrl: `https://www.youtube.com/watch?v=${id}`,
    }];
  });
}

export function getDemoYoutubeResults(query: string): YoutubeVideo[] {
  // oferece um resultado local quando a integração ainda não tem chave configurada.
  const topic = query.trim() || "estudo";
  return [
    {
      id: "demo-css-grid",
      title: `Aula prática: ${topic}`,
      channel: "Apoio IndividuAula",
      description: "Uma sugestão local enquanto a chave da API do YouTube não está configurada.",
      publishedAt: new Date().toISOString(),
      thumbnailUrl: "https://i.ytimg.com/vi/ysz5S6PUM-U/hqdefault.jpg",
      videoUrl: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
    },
  ];
}
