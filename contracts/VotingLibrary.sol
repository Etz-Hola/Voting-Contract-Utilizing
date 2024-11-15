// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;


// Library for vote management and tallying
library VoteLib {
    struct Candidate {
        string name;
        uint256 voteCount;
        bool exists;
    }
    
    struct VotingData {
        mapping(uint256 => Candidate) candidates;
        mapping(address => bool) hasVoted;
        uint256 candidateCount;
        uint256 totalVotes;
        bool votingActive;
    }
    
    // Add a new candidate
    function addCandidate(
        VotingData storage self,
        string memory _name
    ) internal returns (uint256) {
        require(bytes(_name).length > 0, "VoteLib: Empty name not allowed");
        
        uint256 candidateId = self.candidateCount;
        self.candidates[candidateId] = Candidate({
            name: _name,
            voteCount: 0,
            exists: true
        });
        
        self.candidateCount++;
        return candidateId;
    }
    
    // Cast a vote for a candidate
    function castVote(
        VotingData storage self,
        uint256 _candidateId
    ) internal returns (bool) {
        require(self.votingActive, "VoteLib: Voting is not active");
        require(!self.hasVoted[msg.sender], "VoteLib: Already voted");
        require(self.candidates[_candidateId].exists, "VoteLib: Invalid candidate");
        
        self.candidates[_candidateId].voteCount++;
        self.hasVoted[msg.sender] = true;
        self.totalVotes++;
        
        return true;
    }
    
    // Get winning candidate
    function getWinner(VotingData storage self)
        internal
        view
        returns (uint256 winnerId, string memory winnerName, uint256 winningVotes)
    {
        require(self.totalVotes > 0, "VoteLib: No votes cast yet");
        
        uint256 highestVotes = 0;
        
        for (uint256 i = 0; i < self.candidateCount; i++) {
            if (self.candidates[i].voteCount > highestVotes) {
                highestVotes = self.candidates[i].voteCount;
                winnerId = i;
                winnerName = self.candidates[i].name;
                winningVotes = self.candidates[i].voteCount;
            }
        }
    }
    
    // Get vote statistics
    function getVoteStats(
        VotingData storage self,
        uint256 _candidateId
    ) internal view returns (
        string memory name,
        uint256 voteCount,
        uint256 votePercentage
    ) {
        require(self.candidates[_candidateId].exists, "VoteLib: Invalid candidate");
        
        Candidate storage candidate = self.candidates[_candidateId];
        name = candidate.name;
        voteCount = candidate.voteCount;
        votePercentage = self.totalVotes > 0 
            ? (candidate.voteCount * 100) / self.totalVotes 
            : 0;
    }
}
