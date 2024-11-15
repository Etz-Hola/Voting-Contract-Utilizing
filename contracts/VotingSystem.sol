// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./VotingLibrary.sol";

// Main voting contract that uses the VoteLib library
contract VotingSystem {
    using VoteLib for VoteLib.VotingData;
    
    VoteLib.VotingData private votingData;
    address public admin;
    
    event VotingStarted();
    event VotingEnded();
    event CandidateAdded(uint256 indexed candidateId, string name);
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event WinnerDeclared(uint256 indexed winnerId, string name, uint256 votes);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    // Admin functions
    function startVoting() external onlyAdmin {
        require(!votingData.votingActive, "Voting is already active");
        require(votingData.candidateCount > 1, "Need at least 2 candidates");
        
        votingData.votingActive = true;
        emit VotingStarted();
    }
    
    function endVoting() external onlyAdmin {
        require(votingData.votingActive, "Voting is not active");
        
        votingData.votingActive = false;
        emit VotingEnded();
        
        // Declare winner
        (uint256 winnerId, string memory winnerName, uint256 votes) = votingData.getWinner();
        emit WinnerDeclared(winnerId, winnerName, votes);
    }
    
    function addCandidate(string memory _name) external onlyAdmin {
        require(!votingData.votingActive, "Cannot add candidate during active voting");
        
        uint256 candidateId = votingData.addCandidate(_name);
        emit CandidateAdded(candidateId, _name);
    }
    
    // Voter functions
    function castVote(uint256 _candidateId) external {
        require(votingData.castVote(_candidateId), "Vote casting failed");
        emit VoteCast(msg.sender, _candidateId);
    }
    
    // View functions
    function getCandidateStats(uint256 _candidateId) external view returns (
        string memory name,
        uint256 voteCount,
        uint256 votePercentage
    ) {
        return votingData.getVoteStats(_candidateId);
    }
    
    function getCurrentWinner() external view returns (
        uint256 winnerId,
        string memory winnerName,
        uint256 winningVotes
    ) {
        return votingData.getWinner();
    }
    
    function hasVoted(address _voter) external view returns (bool) {
        return votingData.hasVoted[_voter];
    }
    
    function getCandidateCount() external view returns (uint256) {
        return votingData.candidateCount;
    }
    
    function getTotalVotes() external view returns (uint256) {
        return votingData.totalVotes;
    }
    
    function isVotingActive() external view returns (bool) {
        return votingData.votingActive;
    }
}