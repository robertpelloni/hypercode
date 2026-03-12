# Task: Provider Routing Truthfulness

## Context
Provider auth, quota, and fallback-chain exist but the UI overstates accuracy. Live cost/quota fidelity and auth persistence need improvement.

## Requirements
1. Improve live quota tracking and reset-time semantics
2. Harden OAuth/PAT token persistence and refresh
3. Reduce dashboard optimism where backend truth is still shallow
4. Fallback decisions should be explainable from operator-visible data
