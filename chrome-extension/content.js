function exportVisibleLikedVideos() {
  const now = new Date();
  const exportDate = now.toISOString().slice(0, 10);

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function toYmd(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function normalizeDateHeader(headerText) {
    const raw = String(headerText || "").replace(/\s+/g, " ").trim();
    if (!raw) return null;

    if (raw === "오늘" || /^today$/i.test(raw)) return toYmd(now);

    if (raw === "어제" || /^yesterday$/i.test(raw)) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return toYmd(yesterday);
    }

    const koreanMonthDay = raw.match(/^(\d{1,2})월\s*(\d{1,2})일$/);
    if (koreanMonthDay) {
      return `${now.getFullYear()}-${pad(koreanMonthDay[1])}-${pad(koreanMonthDay[2])}`;
    }

    const koreanFull = raw.match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/);
    if (koreanFull) {
      return `${koreanFull[1]}-${pad(koreanFull[2])}-${pad(koreanFull[3])}`;
    }

    const dotted = raw.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?$/);
    if (dotted) {
      return `${dotted[1]}-${pad(dotted[2])}-${pad(dotted[3])}`;
    }

    const isoLike = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoLike) {
      return `${isoLike[1]}-${pad(isoLike[2])}-${pad(isoLike[3])}`;
    }

    const englishMonthDay = raw.match(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})$/i
    );
    if (englishMonthDay) {
      const parsed = new Date(`${englishMonthDay[1]} ${englishMonthDay[2]}, ${now.getFullYear()}`);
      if (!Number.isNaN(parsed.getTime())) return toYmd(parsed);
    }

    const englishFull = raw.match(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}$/i
    );
    if (englishFull) {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) return toYmd(parsed);
    }

    return null;
  }

  function isDateHeaderText(text) {
    return Boolean(normalizeDateHeader(text));
  }

  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }

  function textOf(el) {
    return String(el?.innerText || el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function getTop(el) {
    return el.getBoundingClientRect().top + window.scrollY;
  }

  function getVideoUrl(root) {
    const links = [...root.querySelectorAll("a[href]")];

    for (const link of links) {
      if (!/youtube\.com\/watch|youtu\.be\//i.test(link.href)) continue;

      try {
        const url = new URL(link.href);
        const videoId = url.searchParams.get("v");
        if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
        return link.href.split("&")[0];
      } catch {
        return link.href;
      }
    }

    return "";
  }

  function findDateHeaders() {
    const nodes = [...document.querySelectorAll("h1, h2, h3, span, div")]
      .filter(isVisible)
      .map(el => ({ el, text: textOf(el), top: getTop(el) }))
      .filter(item => isDateHeaderText(item.text));

    const unique = [];
    const seen = new Set();

    nodes.sort((a, b) => a.top - b.top).forEach(item => {
      const key = `${item.text}-${Math.round(item.top)}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });

    return unique;
  }

  function currentDateHeaderForItem(item, dateHeaders) {
    const itemTop = getTop(item);
    let current = null;

    for (const header of dateHeaders) {
      if (header.top <= itemTop + 2) current = header;
      else break;
    }

    return current;
  }

  function findActivityTimeText(item) {
    const detailLine = [...item.querySelectorAll("span, div")]
      .filter(isVisible)
      .map(textOf)
      .find(text => /(?:세부정보|Details)/i.test(text));

    if (!detailLine) return "";

    const koreanTime = detailLine.match(/(?:오전|오후)\s*\d{1,2}:\d{2}/);
    if (koreanTime) return koreanTime[0];

    const englishTime = detailLine.match(/\b\d{1,2}:\d{2}\s*(?:AM|PM)\b/i);
    if (englishTime) return englishTime[0];

    return "";
  }

  function findThumbnailDurationsIgnored(item) {
    const durationPattern = /^(?:\d{1,2}:)?\d{1,2}:\d{2}$/;
    return [...item.querySelectorAll("span, div")]
      .filter(isVisible)
      .map(textOf)
      .filter(text => durationPattern.test(text));
  }

  function extractTitle(item, url) {
    const videoLink = [...item.querySelectorAll("a[href]")]
      .find(a => /youtube\.com\/watch|youtu\.be\//i.test(a.href));

    const linkText = textOf(videoLink);
    if (linkText && !/youtube|watch/i.test(linkText)) return linkText;

    const candidates = [...item.querySelectorAll("h1, h2, h3, [role='heading'], a[href], span")]
      .filter(isVisible)
      .map(textOf)
      .filter(text =>
        text &&
        text.length > 3 &&
        !/(?:세부정보|Details)/i.test(text) &&
        !isDateHeaderText(text) &&
        !/^(?:\d{1,2}:)?\d{1,2}:\d{2}$/.test(text) &&
        !/liked|좋아요|youtube|watch|delete|삭제/i.test(text)
      );

    return candidates[0] || url || "Untitled video";
  }

  function extractChannel(item, title) {
    const candidates = [...item.querySelectorAll("a[href], span, div")]
      .filter(isVisible)
      .map(textOf)
      .filter(text =>
        text &&
        text !== title &&
        text.length > 1 &&
        text.length < 90 &&
        !/(?:세부정보|Details)/i.test(text) &&
        !isDateHeaderText(text) &&
        !/^(?:\d{1,2}:)?\d{1,2}:\d{2}$/.test(text) &&
        !/liked|좋아요|watch|delete|삭제|youtube/i.test(text)
      );

    return candidates[1] || candidates[0] || "";
  }

  const dateHeaders = findDateHeaders();
  const itemCandidates = [...document.querySelectorAll("article, li, div")]
    .filter(isVisible)
    .filter(el => getVideoUrl(el))
    .sort((a, b) => getTop(a) - getTop(b));

  const byUrl = new Map();

  itemCandidates.forEach(item => {
    const url = getVideoUrl(item);
    if (!url || byUrl.has(url)) return;

    const currentHeader = currentDateHeaderForItem(item, dateHeaders);
    const rawLikedAtText = currentHeader?.text || "";
    const likedAt = normalizeDateHeader(rawLikedAtText);

    if (!likedAt) return;

    const title = extractTitle(item, url);
    const channel = extractChannel(item, title);

    console.debug("YouTube Liked Exporter item", {
      title,
      currentDateHeader: rawLikedAtText,
      activityTimeText: findActivityTimeText(item),
      thumbnailDurationIgnored: findThumbnailDurationsIgnored(item).join(", "),
      liked_at: likedAt
    });

    byUrl.set(url, {
      title,
      channel,
      url,
      liked_at: likedAt,
      raw_liked_at_text: rawLikedAtText,
      category: "Uncategorized"
    });
  });

  const data = [...byUrl.values()];
  const fileName = `youtube-liked-export-${exportDate}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = downloadUrl;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(downloadUrl);

  return data.length;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "EXPORT_VISIBLE_LIKED_VIDEOS") return false;

  try {
    const count = exportVisibleLikedVideos();
    sendResponse({ ok: true, count });
  } catch (error) {
    sendResponse({ ok: false, error: error.message });
  }

  return true;
});
