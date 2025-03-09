// 先定义函数再导出
const bugIssueTemplate = (sentryErrorId) => `
### Scene content

\`\`\`
Paste scene content here
\`\`\`

### Sentry Error ID

${sentryErrorId}
`;

export default bugIssueTemplate;
