import streamlit as st
import json
import time
import os
from datetime import datetime

# Set page config
st.set_page_config(
    page_title="The Socratic Editor",
    page_icon="✦",
    layout="centered",
    initial_sidebar_state="expanded"
)

# Custom HSL and Material You tokens matching Gemini mobile replica
gemini_css = """
<style>
    /* Dark Theme Global Reset */
    .stApp {
        background-color: #000000 !important;
        color: #e3e3e3 !important;
    }
    
    /* Google Sans style fonts */
    html, body, [class*="css"] {
        font-family: 'Google Sans', 'Google Sans Text', -apple-system, sans-serif !important;
    }
    
    /* Header styling */
    .gemini-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 0 20px 0;
        border-bottom: 1px solid #313332;
    }
    
    .gemini-sparkle {
        font-size: 24px;
        background: linear-gradient(135deg, #4285f4, #8ab4f8, #c58af9);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: bold;
    }
    
    .gemini-title {
        font-size: 20px;
        font-weight: 500;
        color: #ffffff;
        letter-spacing: -0.2px;
    }
    
    /* Cards and Surfaces */
    .ds-card {
        background-color: #1e1f20;
        border-radius: 16px;
        padding: 20px;
        margin: 10px 0;
        border: 1px solid #313332;
    }
    
    /* Greeting Banner */
    .greeting-text {
        font-size: 28px;
        color: #ffffff;
        line-height: 1.2;
    }
    .greeting-sub {
        font-size: 28px;
        color: #6e7479;
        line-height: 1.2;
        margin-bottom: 8px;
    }
    
    /* Onboarding bubble */
    .hint-bubble {
        background-color: #004a77;
        color: #ffffff;
        font-size: 11px;
        padding: 8px 12px;
        border-radius: 8px;
        display: inline-block;
        margin-top: 5px;
        border-left: 3px solid #8ab4f8;
        animation: pulse 2s infinite;
    }
    
    /* Paradox badge */
    .paradox-badge {
        background-color: rgba(253, 214, 99, 0.08);
        border: 1px solid rgba(253, 214, 99, 0.20);
        color: #fdd663;
        padding: 10px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        margin: 10px 0;
        transition: all 0.2s ease;
    }
    
    /* Speculative block */
    .speculative-block {
        background-color: rgba(253, 214, 99, 0.08);
        border: 1px dashed rgba(253, 214, 99, 0.20);
        border-radius: 12px;
        padding: 16px;
        margin: 10px 0;
    }
    
    /* Accent text */
    .success-text {
        color: #81c995 !important;
        font-size: 12px;
        font-weight: 500;
    }
    
    .warning-text {
        color: #fdd663 !important;
        font-size: 12px;
        font-weight: 500;
    }
</style>
"""
st.markdown(gemini_css, unsafe_allow_html=True)

# Helper functions to load scenarios
def load_scenario_catalog():
    path = "src/content/scenarios/index.json"
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f).get("scenarios", [])
    return [{"id": "churn-analysis", "title": "Churn Analysis", "default": True}]

def load_scenario_data(scenario_id):
    path = f"src/content/scenarios/{scenario_id}.json"
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

scenarios_list = load_scenario_catalog()
scenario_options = {s["title"]: s["id"] for s in scenarios_list}

# Initialize session state variables
if "active_scenario_title" not in st.session_state:
    st.session_state.active_scenario_title = list(scenario_options.keys())[0]

# Watch for scenario switch
if "last_scenario_title" not in st.session_state or st.session_state.last_scenario_title != st.session_state.active_scenario_title:
    st.session_state.last_scenario_title = st.session_state.active_scenario_title
    # Reset state variables for scenario
    scen_id = scenario_options[st.session_state.active_scenario_title]
    data = load_scenario_data(scen_id)
    st.session_state.scenario_data = data
    st.session_state.current_screen = "ingestion"
    st.session_state.extra_sources = []
    st.session_state.grounded_text = data.get("draft", {}).get("groundedParagraph", "")
    st.session_state.speculative_text = data.get("draft", {}).get("speculativeParagraph", "")
    st.session_state.show_paradox = True
    st.session_state.applied_route = None
    st.session_state.pii_redacted = 0
    st.session_state.sql_verified = False
    st.session_state.draft_generated = False
    if "audit_log" not in st.session_state:
        st.session_state.audit_log = []
    st.session_state.audit_log.append({
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "action": f"Switched to scenario: {st.session_state.active_scenario_title}"
    })

data = st.session_state.scenario_data
scen_id = scenario_options[st.session_state.active_scenario_title]

# SIDEBAR: Project Switcher & Audit History
with st.sidebar:
    st.markdown('<div class="gemini-header"><span class="gemini-sparkle">✦</span><span class="gemini-title">Project Panel</span></div>', unsafe_allow_html=True)
    st.write("")
    
    # Switcher Dropdown
    selected_title = st.selectbox(
        "Active Project Scenario",
        options=list(scenario_options.keys()),
        key="active_scenario_title"
    )
    
    st.write("---")
    st.markdown("### 📋 Decision History (Audit Trail)")
    if st.session_state.audit_log:
        for entry in reversed(st.session_state.audit_log):
            st.markdown(f"**[{entry['timestamp']}]** {entry['action']}")
    else:
        st.write("No events logged yet.")

# MAIN PAGE HEADER
header_html = f"""
<div class="gemini-header">
    <span class="gemini-sparkle">✦</span>
    <span class="gemini-title">{st.session_state.active_scenario_title} ▾</span>
</div>
"""
st.markdown(header_html, unsafe_allow_html=True)

# SCREEN 1: Ingestion Overview
if st.session_state.current_screen == "ingestion":
    st.write("")
    st.markdown('<div class="greeting-text">Hello,</div><div class="greeting-sub">Where should we start?</div>', unsafe_allow_html=True)
    
    # Visited nudge
    if "socratic-editor-visited" not in st.session_state:
        st.markdown('<div class="hint-bubble">💡 Tap the left sidebar dropdown to switch between projects!</div>', unsafe_allow_html=True)
        if st.button("Got it"):
            st.session_state["socratic-editor-visited"] = True
            st.rerun()

    # Ground Truth Area
    st.markdown('<div class="ds-card">', unsafe_allow_html=True)
    st.markdown("### Linked Ground Truth")
    
    col1, col2, col3 = st.columns(3)
    with col1:
        if st.button("Add Source"):
            st.toast("Add Source: Uploading mock file ingestion...")
            st.session_state.extra_sources.append("custom_analytics_data.csv")
            st.session_state.audit_log.append({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "action": "Ingested file: custom_analytics_data.csv"
            })
            st.rerun()
    with col2:
        if st.button("Load Samples"):
            st.session_state.extra_sources.append("100_Exit_Surveys.csv")
            st.session_state.pii_redacted = 2
            st.session_state.audit_log.append({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "action": "Loaded samples: 100_Exit_Surveys.csv (2 PII fields redacted)"
            })
            st.toast("Sample CSV loaded! 2 email fields redacted.")
            st.rerun()
    with col3:
        if st.button("Verify SQL"):
            st.session_state.extra_sources.append("postgres_dropoff_logs.sql")
            st.session_state.sql_verified = True
            st.session_state.audit_log.append({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "action": "SQL grounding verified: postgres_dropoff_logs.sql"
            })
            st.toast("Database schema verified via SQL file!")
            st.rerun()
            
    # List current sources
    st.markdown("#### Loaded Sources:")
    default_sources = [s["name"] for s in data.get("groundTruth", [])]
    all_sources = default_sources + st.session_state.extra_sources
    for src in all_sources:
        icon = "📊" if ".sql" in src else "📄"
        st.markdown(f"{icon} `{src}`")
        
    # PII Notice & Ingest Status
    if st.session_state.pii_redacted > 0:
        st.markdown(f'<span class="warning-text">⚠️ {st.session_state.pii_redacted} PII field(s) redacted before grounding</span>', unsafe_allow_html=True)
    if st.session_state.sql_verified:
        st.markdown('<span class="success-text">✓ Context Fully Grounded (2M Window Active)</span>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)
    
    st.write("")
    if st.button(f"Generate {st.session_state.active_scenario_title.replace('Project: ', '')} Framework →", type="primary"):
        st.session_state.current_screen = "draft"
        st.session_state.is_generating = True
        st.rerun()

# SCREEN 2: The Honest Draft
elif st.session_state.current_screen == "draft":
    st.write("")
    
    # Back button
    if st.button("← Go Back"):
        st.session_state.current_screen = "ingestion"
        st.session_state.draft_generated = False
        st.rerun()
        
    st.markdown("## Analytical Draft Framework")
    st.caption("Generated by Gemini (Simulated Stream)")
    
    # Streaming Simulation
    if st.session_state.is_generating:
        st.markdown("### ✦ Thinking...")
        progress_bar = st.progress(0)
        for i in range(100):
            time.sleep(0.015)
            progress_bar.progress(i + 1)
        st.session_state.is_generating = False
        st.session_state.draft_generated = True
        st.session_state.audit_log.append({
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "action": "Generated analytical draft framework"
        })
        st.rerun()
        
    if st.session_state.draft_generated:
        # Grounded block
        st.markdown("### Grounded Analysis")
        # In Streamlit, make the text editable via text_area directly to show the passive editing feature
        edited_grounded = st.text_area(
            "Tap to edit grounded paragraph:",
            value=st.session_state.grounded_text,
            height=120,
            key="grounded_text_area"
        )
        if edited_grounded != st.session_state.grounded_text:
            st.session_state.grounded_text = edited_grounded
            st.session_state.audit_log.append({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "action": "Edited grounded analysis paragraph"
            })
            
        # Socratic Confession / Paradox Inspector
        if st.session_state.show_paradox:
            st.markdown('<div class="warning-text" style="margin-top:10px;">⚠️ Data Paradox Detected: User logs contradict exit surveys.</div>', unsafe_allow_html=True)
            with st.expander("🤔 Tap here to inspect Socratic Confession"):
                confession = data.get("confession", {})
                st.markdown(f"#### {confession.get('title', 'Internal Disagreement')}")
                st.write(confession.get("metaCommentary", ""))
                
                # Routes Selection
                routes = confession.get("routes", [])
                route_options_ui = {r["label"]: r["id"] for r in routes}
                selected_route_label = st.radio("Choose structural route:", list(route_options_ui.keys()))
                selected_route_id = route_options_ui[selected_route_label]
                
                if st.button("Apply Structural Pivot"):
                    # Overwrite text with selected route variant
                    variant = data.get("pivotVariants", {}).get(selected_route_id, {})
                    st.session_state.grounded_text = variant.get("groundedParagraph", "")
                    st.session_state.speculative_text = variant.get("speculativeParagraph", "")
                    st.session_state.show_paradox = variant.get("showParadox", False)
                    st.session_state.applied_route = selected_route_id
                    
                    # Log to audit trail
                    st.session_state.audit_log.append({
                        "timestamp": datetime.now().strftime("%H:%M:%S"),
                        "action": f"Applied Pivot: {selected_route_label}"
                    })
                    
                    # Toast message explaining structural change
                    explanation = "Pivot Applied: Draft rewritten to focus on Qualitative/Pricing signal. Paradox resolved!" if selected_route_id == "route-b" else "Baseline Reverted: Restored baseline onboarding wizard draft (paradox active)."
                    st.toast(explanation)
                    st.rerun()
                    
        # Speculative block
        if st.session_state.speculative_text:
            st.markdown("### Speculative Section")
            block_class = "ds-card" if not st.session_state.show_paradox else "speculative-block"
            st.markdown(f'<div class="{block_class}"><i>{st.session_state.speculative_text}</i></div>', unsafe_allow_html=True)
            
        if st.session_state.applied_route:
            st.markdown(f'<span class="success-text">✓ Applied Structural Pivot: {st.session_state.applied_route.upper()}</span>', unsafe_allow_html=True)
