import os
import json
import time
from google import genai
from dotenv import load_dotenv
from google.genai import types 
from dacite import from_dict, Config
import requests
from fastapi import FastAPI
from ctypes import MeilisearchMultiResponse, SearchHit, SearchResultBlock
from typing import Dict, Any
import asyncio
import threading

def query_meilisearch(text_input: str):
    url = "https://edge.meilisearch.com/multi-search"
    payload = {"queries":[{"indexUid":"movies-en-US","q":text_input,"attributesToHighlight":["*"],"highlightPreTag":"__ais-highlight__","highlightPostTag":"__/ais-highlight__","limit":9,"offset":0,"hybrid":{"embedder":"small","semanticRatio":0.7},"rankingScoreThreshold":0.2}]}
    headers = {
        "Authorization": "Bearer 6287312fd043d3fca95136cd40483a26154d37dc99aa2e79417f88794a80cd1c",
        "Content-length": str(len(payload)),
        "Content-type": "application/json"
    }

    req = requests.post(url, headers=headers, json=payload)
    if req.status_code != 200:
        return "Request failed with status code: " + str(req.status_code)
    data: MeilisearchMultiResponse = req.json()
    return data
    
class AdvancedAgent:
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash"):
        if not api_key:
            raise ValueError("API Key not found. Please ensure it is set.")
        
        self.client = genai.Client(api_key=api_key)
        self.model = model_name
        
        self.tool_functions = {
            "query_meilisearch": query_meilisearch
        }
        
        with open("sys_prompt", "r") as sys_prompt_file:
            sys_prompt = sys_prompt_file.read()

        config = types.GenerateContentConfig(
            tools=list(self.tool_functions.values()),
            system_instruction=sys_prompt
            # Any other config, like temperature, would go here:
            # temperature=0.1 
        )
        
        # Pass the config object to the 'config' argument in chats.create
        self.chat = self.client.chats.create(
            model=self.model,
            config=config
        )
        print(f"🤖 Advanced Agent initialized with {len(self.tool_functions)} tools.")
        print("-" * 50)

    def handle_conversation(self, prompt: str):
        
        response = self.chat.send_message(prompt)

        while response.function_calls:
            print(f"-> Model requested {len(response.function_calls)} tool call(s)...")
            
            tool_responses = []
            for call in response.function_calls:
                function_name = call.name
                function_args = dict(call.args)
                
                if function_name in self.tool_functions:
                    print(f"   Executing: {function_name}({function_args})")
                    tool_output = self.tool_functions[function_name](**function_args)
                    print(f"   Tool Output Snippet: {tool_output[:50]}...")
                    
                    tool_response_part = types.Part.from_function_response(
                        name=function_name,
                        response={"result": tool_output} 
                    )
                    tool_responses.append(tool_response_part)
                else:
                    tool_response_part = types.Part.from_function_response(
                        name=function_name,
                        response={"result": f"Error: Unknown tool '{function_name}'"}
                    )
                    tool_responses.append(tool_response_part)

            response = self.chat.send_message(tool_responses)
        
        return response.text

# ==============================================================================

load_dotenv()
API_KEY = os.getenv("GOOGLE_AI_API_KEY")

app = FastAPI(title="Movie API")
pool = {} # session_id <==> agent instance

# Workers that check the agent_pool and their TTL 
def worker_pool(flag: threading.Event):
    current_time = int(time.time())

    while (not flag.is_set()):
        keys_to_del = []
        for key, val in pool.items():
            if val['time_to_live'] >= current_time:
                keys_to_del.append(key)

        for key in keys_to_del:
            del pool[key]['agent']
            del pool[key]
        
        flag.wait(1)

stop_flag: threading.Event = threading.Event()
worker = threading.Thread(
    target=worker_pool,
    args=(stop_flag,),
    name="worker pool checker"
)
worker.start()

@app.get('/api/chat')
async def root(user_msg: str, user_sess_id: str):
    current_time = int(time.time())
    
    if user_msg == None or len(user_msg) == 0 or user_sess_id == None:
        return {}
    
    if not pool.get(user_sess_id):
        
        pool[user_sess_id] = {
            "agent": AdvancedAgent(api_key=API_KEY),
            "time_to_live": current_time + (7 * 60) # 7 minutes of TTL
        }
    
    user_agent = pool[user_sess_id]['agent']
    res = user_agent.handle_conversation(user_msg)
    return res

# worker.join()
