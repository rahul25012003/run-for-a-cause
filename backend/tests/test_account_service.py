"""Pure-function tests for account_service helpers — no DB required."""
from app.services.account_service import GRACE_PERIOD_DAYS


def test_grace_period_constant() -> None:
    """The grace period must stay 30 days for DPDP compliance.

    Changing this is allowed but should be a deliberate, reviewed change.
    The test exists so a casual edit triggers a CI failure to force the
    conversation.
    """
    assert GRACE_PERIOD_DAYS == 30
