import streamlit as st
import streamlit.components.v1 as components
import json
import os
import re

# Set page config
st.set_page_config(
    page_title="The Socratic Editor",
    page_icon="✦",
    layout="centered"
)

# Custom styles to wrap Streamlit HTML component container in an iPhone mockup frame
st.markdown("""
<style>
    /* Dark Theme Global Reset */
    .stApp {
        background-color: #000000 !important;
        color: #e3e3e3 !important;
    }
    
    /* Hide Streamlit default header, footer, and menu */
    [data-testid="stHeader"], header, footer {
        display: none !important;
        visibility: hidden !important;
    }
    
    /* Center and style the HTML container to look exactly like a mobile shell on desktop */
    @media (min-width: 500px) {
        [data-testid="stHtml"] {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            background-color: #000000 !important;
            margin: 40px auto !important;
            width: 375px !important;
            height: 812px !important;
            border: 12px solid #282a2c !important;
            border-radius: 40px !important;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.9) !important;
            overflow: hidden !important;
        }
        [data-testid="stHtml"] iframe {
            width: 375px !important;
            height: 812px !important;
            border: none !important;
        }
    }
    
    /* On mobile screens, let it expand naturally */
    @media (max-width: 499px) {
        [data-testid="stHtml"] {
            width: 100% !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
        }
        [data-testid="stHtml"] iframe {
            width: 100% !important;
            height: 100vh !important;
            border: none !important;
        }
    }
</style>
""", unsafe_allow_html=True)

def build_inlined_html():
    # 1. Read build index.html
    index_path = "dist/index.html"
    if not os.path.exists(index_path):
        return "<h3>Error: Please build the project first by running `npm run build` or running the build script.</h3>"
        
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()
        
    # Strip index.html default body centering & shell size to fit perfectly inside the iframe
    html = html.replace(
        '<body style="background:#000; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:1.5rem;">',
        '<body style="background:#000; margin:0; padding:0; overflow:hidden; height:100vh; width:100vw;">'
    )
    
    html = html.replace(
        'style="width:375px; height:812px; border-radius:40px; overflow:hidden;"',
        'style="width:100%; height:100%; border-radius:0; overflow:hidden;"'
    )

    # 2. Inline App Bundle CSS
    css_path = "dist/css/app.bundle.css"
    if os.path.exists(css_path):
        with open(css_path, "r", encoding="utf-8") as f:
            css_content = f.read()
        html = html.replace('<link rel="stylesheet" href="css/app.bundle.css">', f"<style>{css_content}</style>")

    # 3. Read scenarios JSON and construct scenario dict to inject
    scenarios = {}
    scenarios_dir = "dist/content/scenarios"
    index_json_path = os.path.join(scenarios_dir, "index.json")
    
    if os.path.exists(index_json_path):
        with open(index_json_path, "r", encoding="utf-8") as f:
            index_data = json.load(f)
            scenarios_index = index_data.get("scenarios", [])
            
        for s in scenarios_index:
            s_id = s["id"]
            scenario_path = os.path.join(scenarios_dir, f"{s_id}.json")
            if os.path.exists(scenario_path):
                with open(scenario_path, "r", encoding="utf-8") as f:
                    scenarios[s_id] = json.load(f)
    else:
        scenarios_index = [{"id": "churn-analysis", "title": "Churn Analysis", "default": True}]
        scenarios = {}

    # 4. Inject Mock Fetch Interceptor (before any script tags)
    mock_fetch_js = f"""
    <script>
      (function() {{
        const scenarioIndex = {json.dumps(scenarios_index)};
        const scenarioData = {json.dumps(scenarios)};
        let sessionState = {{}};
        let auditEntries = [];
        
        const originalFetch = window.fetch;
        window.fetch = async function(url, options) {{
          const pathname = url.split('?')[0];
          
          if (pathname.startsWith('/api/')) {{
            // Intercept all API endpoints
            if (pathname === '/api/health') {{
              return new Response(JSON.stringify({{ ok: true, geminiConfigured: false, model: 'simulated' }}), {{
                headers: {{ 'Content-Type': 'application/json' }}
              }});
            }}
            if (pathname === '/api/self-test') {{
              return new Response(JSON.stringify({{ ok: true, checks: [] }}), {{
                headers: {{ 'Content-Type': 'application/json' }}
              }});
            }}
            if (pathname === '/api/scenarios') {{
              return new Response(JSON.stringify({{ scenarios: scenarioIndex }}), {{
                headers: {{ 'Content-Type': 'application/json' }}
              }});
            }}
            if (pathname.startsWith('/api/scenarios/')) {{
              const id = pathname.split('/').pop();
              return new Response(JSON.stringify(scenarioData[id] || {{}}), {{
                headers: {{ 'Content-Type': 'application/json' }}
              }});
            }}
            if (pathname === '/api/ingest') {{
              const body = options?.body ? JSON.parse(options.body) : {{}};
              const rawFiles = body.files || [];
              const verified = rawFiles.map(f => ({{
                type: f.name.endsWith('.sql') ? 'database' : 'file',
                name: f.name,
                icon: f.name.endsWith('.sql') ? 'database' : 'document',
                content: f.content
              }}));
              
              return new Response(JSON.stringify({{
                grounded: true,
                verified: verified,
                rejected: [],
                piiRedactions: verified.length > 0 ? 2 : 0,
                contextWindow: {{ active: true, utilizationPct: 0.02, usedTokens: 400, maxTokens: 2000000, label: 'Context Fully Grounded (2M Window Active)' }}
              }}), {{
                headers: {{ 'Content-Type': 'application/json' }}
              }});
            }}
            if (pathname === '/api/connect-database') {{
              return new Response(JSON.stringify({{ connected: true, mode: 'sql_file', securityNote: 'grounded', verified: [{{ type: 'database', name: 'postgres_dropoff_logs.sql', icon: 'database' }}], grounding: {{ label: 'SQL database schema loaded', grounded: true }} }}), {{
                headers: {{ 'Content-Type': 'application/json' }}
              }});
            }}
            if (pathname.startsWith('/api/state/')) {{
              const id = pathname.split('/').pop();
              if (options?.method === 'POST') {{
                sessionState[id] = options.body ? JSON.parse(options.body) : {{}};
              }}
              return new Response(JSON.stringify(sessionState[id] || {{}}), {{
                headers: {{ 'Content-Type': 'application/json' }}
              }});
            }}
            if (pathname === '/api/audit') {{
              if (options?.method === 'POST') {{
                const body = options.body ? JSON.parse(options.body) : {{}};
                const cleanAction = body.action === 'pivot' ? `Applied Pivot: ${{body.metadata?.routeId?.toUpperCase()}}` :
                                    body.action === 'generate' ? 'Generated analytical draft framework' :
                                    body.action === 'ingest' ? `Ingested ${{body.metadata?.filesCount}} file(s)` : body.action;
                auditEntries.push({{
                  action: body.action,
                  scenarioId: body.scenarioId,
                  timestamp: new Date().toLocaleTimeString(),
                  metadata: body.metadata || {{}},
                  // mock structure mapping
                  actionLabel: cleanAction
                }});
                return new Response(JSON.stringify({{ ok: true }}), {{ headers: {{ 'Content-Type': 'application/json' }} }});
              }} else {{
                // GET
                // map structures to client list format
                const entries = auditEntries.map(e => ({{
                  action: e.action,
                  scenarioId: e.scenarioId,
                  timestamp: e.timestamp,
                  actionLabel: e.actionLabel,
                  metadata: e.metadata
                }}));
                return new Response(JSON.stringify({{ entries: entries }}), {{
                  headers: {{ 'Content-Type': 'application/json' }}
                }});
              }}
            }}
            if (pathname === '/api/generate-draft') {{
              const body = options?.body ? JSON.parse(options.body) : {{}};
              const id = body.scenarioId || 'churn-analysis';
              const scenario = scenarioData[id];
              const draft = scenario.draft;
              const confession = scenario.confession.metaCommentary;
              
              const encoder = new TextEncoder();
              const stream = new ReadableStream({{
                async start(controller) {{
                  const send = (event, data) => {{
                    const chunk = `event: ${{event}}\\ndata: ${{JSON.stringify(data)}}\\n\\n`;
                    controller.enqueue(encoder.encode(chunk));
                  }};
                  
                  send('start', {{ mode: 'simulated', scenarioId: id }});
                  
                  const fullText = `[GROUNDED]\\n${{draft.groundedParagraph}}\\n\\n[SPECULATIVE]\\n${{draft.speculativeParagraph}}\\n\\n[CONFESSION]\\n${{confession}}`;
                  const words = fullText.split(/(\\s+)/);
                  for (const word of words) {{
                    send('token', {{ text: word }});
                    await new Promise(r => setTimeout(r, 15));
                  }
                  
                  send('complete', {{
                    draft: {{
                      groundedParagraph: draft.groundedParagraph,
                      speculativeParagraph: draft.speculativeParagraph,
                      paradoxBadgeLabel: draft.paradoxBadgeLabel
                    }},
                    confession: {{ metaCommentary: confession }},
                    paradox: {{ hasParadox: true, confidence: 0.85, badgeLabel: draft.paradoxBadgeLabel, reason: 'surveys vs logs' }}
                  }});
                  controller.close();
                }}
              }});
              
              return new Response(stream, {{
                headers: {{ 'Content-Type': 'text/event-stream' }}
              }});
            }}
          }}
          
          return originalFetch(url, options);
        }};
      }})();
    </script>
    """
    
    # Insert mock fetch right before the first script tag
    idx = html.find('<script')
    if idx != -1:
        html = html[:idx] + mock_fetch_js + html[idx:]
        
    # 5. Inline JavaScript Files
    script_regex = re.compile(r'<script src="js/([^"]+)"></script>')
    
    def replace_script(match):
        js_file = match.group(1)
        js_path = f"dist/js/{js_file}"
        if os.path.exists(js_path):
            with open(js_path, "r", encoding="utf-8") as f:
                js_content = f.read()
            return f"<script>{js_content}</script>"
        return match.group(0)
        
    html = script_regex.sub(replace_script, html)
    return html

# Build the html content
inlined_html = build_inlined_html()

# Display the inlined HTML frame in Streamlit
components.html(inlined_html, height=788)
