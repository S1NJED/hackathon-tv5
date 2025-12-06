import requests


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
    data = req.json()
    return data