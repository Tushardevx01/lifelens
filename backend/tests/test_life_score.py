"""
Tests for the life score computation.
"""
import pytest
from app.ml.life_score import compute_life_score, get_score_band


class TestLifeScore:
    def test_perfect_day(self):
        """All components at 100, mood 10 → 100 (capped)"""
        result = compute_life_score(100, 100, 1.0, 100, 10)
        assert result['life_score'] == 100.0

    def test_zero_day(self):
        """All components at 0, mood 1 → 0 (floored) + negative mood adj"""
        result = compute_life_score(0, 0, 0, 0, 1)
        assert result['life_score'] == 0.0

    def test_average_day(self):
        """50 all, mood 5 → 50 (no mood adjustment)"""
        result = compute_life_score(50, 50, 0.5, 50, 5)
        assert result['life_score'] == 50.0
        assert result['mood_adjustment'] == 0.0

    def test_mood_boost(self):
        """Mood 10 gives +5 adjustment"""
        result = compute_life_score(50, 50, 0.5, 50, 10)
        assert result['mood_adjustment'] == 5.0
        assert result['life_score'] == 55.0

    def test_mood_penalty(self):
        """Mood 1 gives approximately -4 adjustment"""
        result = compute_life_score(50, 50, 0.5, 50, 1)
        assert result['mood_adjustment'] == -4.0
        assert result['life_score'] == 46.0

    def test_no_mood(self):
        """No mood → no adjustment"""
        result = compute_life_score(50, 50, 0.5, 50, None)
        assert result['mood_adjustment'] == 0.0
        assert result['life_score'] == 50.0

    def test_components_returned(self):
        result = compute_life_score(80, 70, 0.6, 90, 7)
        assert 'life_score_sleep' in result
        assert 'life_score_productivity' in result
        assert 'life_score_health' in result
        assert 'life_score_finance' in result
        assert 'formula_display' in result

    def test_formula_display_is_string(self):
        result = compute_life_score(50, 50, 0.5, 50, 5)
        assert isinstance(result['formula_display'], str)
        assert '×0.30' in result['formula_display']


class TestScoreBand:
    def test_optimal(self):
        assert get_score_band(90)['label'] == 'Optimal'

    def test_good(self):
        assert get_score_band(75)['label'] == 'Good'

    def test_average(self):
        assert get_score_band(60)['label'] == 'Average'

    def test_below_average(self):
        assert get_score_band(45)['label'] == 'Below Average'

    def test_critical(self):
        assert get_score_band(20)['label'] == 'Critical'
