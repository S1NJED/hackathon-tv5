from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

# --- Nested Structures ---

@dataclass
class CrewMember:
    """Represents a person in the Crew."""
    name: str
    job: str
    id: int
    
@dataclass
class CastMember:
    """Represents a person in the Cast."""
    id: int
    character: str
    name: str
    profile_path: Optional[str] = None
    
@dataclass
class ProviderDetails:
    """Represents a single streaming/buying provider."""
    name: str
    logo: str

@dataclass
class Providers:
    """Groups providers by type (buy, rent, flatrate)."""
    buy: List[ProviderDetails] = field(default_factory=list)
    rent: List[ProviderDetails] = field(default_factory=list)
    flatrate: List[ProviderDetails] = field(default_factory=list)

# --- Movie Hit Interface ---

@dataclass
class SearchHit:
    """Represents a single movie result within the search hits."""
    id: int
    title: str
    overview: str
    keywords: List[str]
    popularity: float
    release_date: str
    runtime: int
    vote_average: float
    poster_path: str
    backdrop_path: str
    genres: List[str]
    crew: List[CrewMember]
    cast: List[CastMember]
    providers: Providers
    provider_names: List[str]
    external_ids: Dict[str, Optional[str]] = field(default_factory=dict)
    _formatted: Dict[str, Any] = field(default_factory=dict)

# --- Search Result Block Interface ---

@dataclass
class SearchResultBlock:
    """Represents the object inside the top-level 'results' list."""
    index_uid: str
    query: str
    processing_time_ms: int
    limit: int
    offset: int
    estimated_total_hits: int
    hits: List[SearchHit]
    request_uid: str
    semantic_hit_count: int
    metadata: Dict[str, str] = field(default_factory=dict)

# --- Top-Level API Response ---
@dataclass
class MeilisearchMultiResponse:
    """Represents the final, top-level JSON object."""
    # This is the main class you want to export
    results: List[SearchResultBlock]