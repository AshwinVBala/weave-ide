pub fn generate_html_runner(title: &str, component_name: &str, tsx_code: &str) -> String {
    // Strip external import statements for browser-native Babel standalone execution
    let mut cleaned_code = String::new();
    for line in tsx_code.lines() {
        if line.starts_with("import ") {
            continue;
        }
        cleaned_code.push_str(line);
        cleaned_code.push('\n');
    }

    // Replace export keywords for inline execution
    let executable_code = cleaned_code
        .replace("export default", "// default export:")
        .replace("export const", "const")
        .replace("export function", "function")
        .replace("export async function", "async function");

    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weave App - {title}</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }}
    body {{
      background: #f1f5f9;
      color: #0f172a;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }}
    #root {{
      width: 100%;
      max-width: 640px;
    }}
    button {{
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      color: #0f172a;
      cursor: pointer;
      transition: all 0.15s ease;
    }}
    button:hover {{
      background: #f8fafc;
      border-color: #94a3b8;
    }}
    button:active {{
      background: #e2e8f0;
    }}
    input[type="text"] {{
      padding: 8px 12px;
      font-size: 14px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      outline: none;
      width: 100%;
      background: #ffffff;
    }}
    input[type="text"]:focus {{
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
    }}
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    const {{ useState, useEffect, useCallback, useMemo }} = React;

    {executable_code}

    const rootElement = document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    root.render(<{component_name} />);
  </script>
</body>
</html>
"#,
        title = title,
        executable_code = executable_code,
        component_name = component_name
    )
}
