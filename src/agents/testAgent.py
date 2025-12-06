import os
import json
from google import genai
from dotenv import load_dotenv
# We need to explicitly import the types for configuration
from google.genai import types 
from dacite import from_dict, Config
import requests

from ctypes import MeilisearchMultiResponse, SearchHit, SearchResultBlock
from typing import Dict, Any

def query_meilisearch(text_input: str):
    url = "https://edge.meilisearch.com/multi-search"
    payload = {"queries":[{"indexUid":"movies-en-US","q":text_input,"attributesToHighlight":["*"],"highlightPreTag":"__ais-highlight__","highlightPostTag":"__/ais-highlight__","limit":9,"offset":0,"hybrid":{"embedder":"small","semanticRatio":0.7},"rankingScoreThreshold":0.2}]}
    
    req = requests.post(url, data=payload)
    data: MeilisearchMultiResponse = req.json()
    
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
            config=config # <--- This is the fix!
        )
        print(f"🤖 Advanced Agent initialized with {len(self.tool_functions)} tools.")
        print("-" * 50)

    # (The handle_conversation and main execution loop remains the same)
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

# --- Running the Agent (Remains the same) ---
if __name__ == "__main__":
    load_dotenv()
    API_KEY = os.getenv("GOOGLE_AI_API_KEY") 
    
    try:
        agent = AdvancedAgent(api_key=API_KEY)

        # Example 1: Read Tool
        while True:
            user = input("> ")
            if user == "quit":
                exit(0)
            res = agent.handle_conversation(user)
            print(res)
        
    except Exception as err:
        print(f"An error occurred: {err}")