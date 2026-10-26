import { describe, expect, it } from "vitest";
import { getDemoYoutubeResults, mapYoutubeSearchResponse } from "@/lib/youtube";

describe("contrato da integração com o YouTube", () => {
  it("normaliza a resposta externa para o modelo da interface", () => {
    const result = mapYoutubeSearchResponse({
      items: [
        {
          id: { videoId: "abc123" },
          snippet: {
            title: "CSS Grid na prática",
            description: "Uma aula curta.",
            channelTitle: "Web em foco",
            publishedAt: "2026-09-20T12:00:00Z",
            thumbnails: { medium: { url: "https://img.youtube.com/abc.jpg" } },
          },
        },
      ],
    });

    expect(result[0]).toMatchObject({
      id: "abc123",
      title: "CSS Grid na prática",
      channel: "Web em foco",
      thumbnailUrl: "https://img.youtube.com/abc.jpg",
      description: "Uma aula curta.",
      publishedAt: "2026-09-20T12:00:00Z",
    });
  });

  it("ignora itens sem videoId", () => {
    expect(mapYoutubeSearchResponse({ items: [{ id: {}, snippet: { title: "playlist" } }] })).toEqual([]);
  });

  it("usa uma miniatura segura quando a resposta externa não traz thumbnail", () => {
    const [result] = mapYoutubeSearchResponse({
      items: [{ id: { videoId: "abc123" }, snippet: { title: "Aula" } }],
    });

    expect(result.thumbnailUrl).toContain("abc123");
    expect(result.videoUrl).toBe("https://www.youtube.com/watch?v=abc123");
  });

  it("descarta resultados sem título ou com URL de miniatura inválida", () => {
    const result = mapYoutubeSearchResponse({
      items: [
        { id: { videoId: "sem-titulo" }, snippet: {} },
        {
          id: { videoId: "com-titulo" },
          snippet: {
            title: "Aula segura",
            thumbnails: { medium: { url: "javascript:alert(1)" } },
          },
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].thumbnailUrl).not.toMatch(/^javascript:/i);
  });

  it("oferece dados locais quando a chave externa não está configurada", () => {
    expect(getDemoYoutubeResults("css grid").length).toBeGreaterThan(0);
  });
});
