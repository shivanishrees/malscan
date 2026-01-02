def calculate_risk(static_score, behavior_score, source_score, community_score):
    return min(
        static_score + behavior_score + source_score + community_score,
        100
    )
