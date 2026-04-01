# Backlog

Ideas and known issues — not yet scheduled for any version.

---

## Improvements

- [ ] Vocabulary level: adjust difficulty to match user's actual level
单词提取不再依赖LLM，根据用户水平维护一个生词本，生词本只包含单词，vocabulary section展示的内容用一个单独的API调用，如果用户觉得单词已学会，可从生词本移除，之后将不会关键词检索这个词
此方案解决的需求是：LLM认为值得记忆的词用户实际上不需要，或用户觉得重要的词 LLM 没有解析 （没有解决）

## Future Plan

- [ ] Voice input + image recognition for sentence capture
- [ ] Conversational AI mode — capture and analyze each sentence in real-time

## Bugs

- [ ] History list: long sentences overflow and overlay the delete button (needs text wrapping / truncation)

## Open Questions

- Review optimization: leverage tags, highlight key words, show sentence explanation, remove noise
- UI polish and faster data loading
- Keep CLAUDE.md in sync when architecture changes
