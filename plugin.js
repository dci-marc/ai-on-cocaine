// ==UserScript==
// @name         AI → cocaine (sentence-aware)
// @namespace    com.example.ai2cocaine
// @version      1.0.0
// @description  Replace abbreviation "AI" with "cocaine", considering sentence start/end in running text.
// @match        *://*/*
// @run-at       document_idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // Tags whose contents should NOT be altered
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);

  // Checks if position i in "text" is at the beginning of a sentence (considering quotes)
  function isSentenceStart(text, i) {
    // Move left to the next non-whitespace character
    let j = i - 1;
    while (j >= 0 && /\s/.test(text[j])) j--;

    // Beginning of string => sentence start
    if (j < 0) return true;

    // Skip closing quotes/brackets
    while (j >= 0 && /["'”»)\]]/.test(text[j])) j--;

    if (j < 0) return true;

    // Previous char is sentence-ending punctuation => new sentence
    if (/[.!?…]/.test(text[j])) return true;

    return false;
  }

  // Checks if the position after "AI" is at the end of a sentence (optional)
  function isSentenceEnd(text, endIdxExclusive) {
    // Move right to the next non-whitespace character
    let k = endIdxExclusive;
    while (k < text.length && /\s/.test(text[k])) k++;

    // End of string => sentence end
    if (k >= text.length) return true;

    // Immediate sentence-ending punctuation
    if (/[.!?…]/.test(text[k])) return true;

    // Optional: opening quote/bracket followed by sentence-ending punctuation
    if (/[«“(\[]/.test(text[k])) {
      k++;
      while (k < text.length && /\s/.test(text[k])) k++;
      if (k >= text.length) return true;
      if (/[.!?…]/.test(text[k])) return true;
    }

    return false;
  }

  // Replace all occurrences of "AI" (as a standalone word) in a text node
  function replaceAI(text) {
    // \bAI\b matches "AI" as a whole word (also before/with hyphen, e.g., "AI-tools")
    const re = /\bAI\b/g;
    let result = "";
    let lastIndex = 0;
    let match;

    while ((match = re.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      // Determine context
      const atStart = isSentenceStart(text, start);
      // const atEnd = isSentenceEnd(text, end); // not currently used

      // Choose replacement
      const replacement = atStart ? "Cocaine" : "cocaine";

      // Build new string piece by piece
      result += text.slice(lastIndex, start) + replacement;
      lastIndex = end;
    }

    // Append remaining text
    if (lastIndex === 0) return text; // no match
    result += text.slice(lastIndex);
    return result;
  }

  function shouldSkipNode(node) {
    if (!node || !node.parentNode) return true;
    if (node.parentNode.nodeType !== Node.ELEMENT_NODE) return true;

    const el = node.parentNode;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.isContentEditable) return true;

    return false;
  }

  function processTextNode(node) {
    if (shouldSkipNode(node)) return;
    const original = node.nodeValue;
    const replaced = replaceAI(original);
    if (replaced !== original) {
      node.nodeValue = replaced;
    }
  }

  // Walk through all existing text nodes
  function walk(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          // Only handle "visible" text (at least 2 chars to avoid noise)
          if (!node.nodeValue || node.nodeValue.trim().length < 2) {
            return NodeFilter.FILTER_REJECT;
          }
          if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      },
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      processTextNode(node);
    }
  }

  // Initial run
  walk(document.body);

  // Observe dynamic changes (e.g., AJAX, SPAs, infinite scroll)
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          processTextNode(node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          walk(node);
        }
      }
      // Handle direct text changes
      if (m.type === "characterData" && m.target.nodeType === Node.TEXT_NODE) {
        processTextNode(m.target);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
