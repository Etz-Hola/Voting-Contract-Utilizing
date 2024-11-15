const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VotingSystem", function () {
    let VotingSystem;
    let voting;
    let admin, user1, user2, user3;

    beforeEach(async function () {
        [admin, user1, user2, user3] = await ethers.getSigners();
        VotingSystem = await ethers.getContractFactory("VotingSystem");
        voting = await VotingSystem.deploy();
        await voting.deployed();
    });

    describe("Voting Process", function () {
        it("Should allow admin to add candidates", async function () {
            await voting.connect(admin).addCandidate("Candidate 1");
            await voting.connect(admin).addCandidate("Candidate 2");
            
            expect(await voting.getCandidateCount()).to.equal(2);
        });

        it("Should not allow non-admin to add candidates", async function () {
            await expect(
                voting.connect(user1).addCandidate("Candidate 1")
            ).to.be.revertedWith("Only admin can call this function");
        });

        it("Should allow users to cast votes", async function () {
            await voting.connect(admin).addCandidate("Candidate 1");
            await voting.connect(admin).addCandidate("Candidate 2");
            await voting.connect(admin).startVoting();

            await voting.connect(user1).castVote(0);
            await voting.connect(user2).castVote(1);

            expect(await voting.hasVoted(user1.address)).to.be.true;
            expect(await voting.hasVoted(user2.address)).to.be.true;
            expect(await voting.hasVoted(user3.address)).to.be.false;
        });

        it("Should not allow users to vote after voting ends", async function () {
            await voting.connect(admin).addCandidate("Candidate 1");
            await voting.connect(admin).addCandidate("Candidate 2");
            await voting.connect(admin).startVoting();
            await voting.connect(admin).endVoting();

            await expect(
                voting.connect(user1).castVote(0)
            ).to.be.revertedWith("Voting is not active");
        });

        it("Should not allow users to vote twice", async function () {
            await voting.connect(admin).addCandidate("Candidate 1");
            await voting.connect(admin).startVoting();

            await voting.connect(user1).castVote(0);
            await expect(
                voting.connect(user1).castVote(0)
            ).to.be.revertedWith("Already voted");
        });
    });

    describe("Vote Tallying", function () {
        beforeEach(async function () {
            await voting.connect(admin).addCandidate("Candidate 1");
            await voting.connect(admin).addCandidate("Candidate 2");
            await voting.connect(admin).addCandidate("Candidate 3");
            await voting.connect(admin).startVoting();
        });

        it("Should correctly tally votes", async function () {
            await voting.connect(user1).castVote(0);
            await voting.connect(user2).castVote(1);
            await voting.connect(user3).castVote(2);

            const [, winnerName, winningVotes] = await voting.getCurrentWinner();
            expect(winnerName).to.equal("Candidate 3");
            expect(winningVotes).to.equal(1);

            const [c1Name, c1Votes, c1Percentage] = await voting.getCandidateStats(0);
            const [c2Name, c2Votes, c2Percentage] = await voting.getCandidateStats(1);
            const [c3Name, c3Votes, c3Percentage] = await voting.getCandidateStats(2);

            expect(c1Name).to.equal("Candidate 1");
            expect(c1Votes).to.equal(1);
            expect(c1Percentage).to.equal(33);

            expect(c2Name).to.equal("Candidate 2");
            expect(c2Votes).to.equal(1);
            expect(c2Percentage).to.equal(33);

            expect(c3Name).to.equal("Candidate 3");
            expect(c3Votes).to.equal(1);
            expect(c3Percentage).to.equal(33);
        });

        it("Should correctly handle tie scenarios", async function () {
            await voting.connect(user1).castVote(0);
            await voting.connect(user2).castVote(1);
            await voting.connect(user3).castVote(1);

            const [, winnerName, winningVotes] = await voting.getCurrentWinner();
            expect(winnerName).to.equal("Candidate 2");
            expect(winningVotes).to.equal(2);
        });

        it("Should not allow winner declaration without any votes", async function () {
            await expect(
                voting.getCurrentWinner()
            ).to.be.revertedWith("No votes cast yet");
        });
    });

    describe("Voting Lifecycle", function () {
        it("Should not allow voting without at least 2 candidates", async function () {
            await voting.connect(admin).addCandidate("Candidate 1");
            await expect(
                voting.connect(admin).startVoting()
            ).to.be.revertedWith("Need at least 2 candidates");
        });

        it("Should not allow adding candidates during active voting", async function () {
            await voting.connect(admin).addCandidate("Candidate 1");
            await voting.connect(admin).startVoting();
            
            await expect(
                voting.connect(admin).addCandidate("Candidate 2")
            ).to.be.revertedWith("Cannot add candidate during active voting");
        });

        it("Should correctly handle voting start and end", async function () {
            await voting.connect(admin).addCandidate("Candidate 1");
            await voting.connect(admin).addCandidate("Candidate 2");

            await voting.connect(admin).startVoting();
            expect(await voting.isVotingActive()).to.be.true;

            await voting.connect(admin).endVoting();
            expect(await voting.isVotingActive()).to.be.false;
        });
    });

    describe("Events", function () {
        it("Should emit events for key actions", async function () {
            await expect(voting.connect(admin).addCandidate("Candidate 1"))
                .to.emit(voting, "CandidateAdded")
                .withArgs(0, "Candidate 1");

            await expect(voting.connect(user1).castVote(0))
                .to.emit(voting, "VoteCast")
                .withArgs(user1.address, 0);

            await voting.connect(admin).addCandidate("Candidate 2");
            await voting.connect(admin).startVoting();
            await voting.connect(admin).endVoting();

            await expect(voting.connect(admin).endVoting())
                .to.emit(voting, "VotingEnded");

            const [, winnerName] = await voting.getCurrentWinner();
            expect(winnerName).to.equal("Candidate 1");
        });
    });

    describe("Gas Usage", function () {
        it("Should track gas usage for vote casting", async function () {
            await voting.connect(admin).addCandidate("Candidate 1");
            await voting.connect(admin).startVoting();

            const tx = await voting.connect(user1).castVote(0);
            const receipt = await tx.wait();

            console.log("Gas used for vote casting:", receipt.gasUsed.toString());
            expect(receipt.gasUsed.gt(0)).to.be.true;
        });

        it("Should track gas usage for winner declaration", async function () {
            await voting.connect(admin).addCandidate("Candidate 1");
            await voting.connect(admin).addCandidate("Candidate 2");
            await voting.connect(admin).startVoting();

            await voting.connect(user1).castVote(0);
            await voting.connect(admin).endVoting();

            const tx = await voting.getCurrentWinner();
            const receipt = await tx.wait();

            console.log("Gas used for winner declaration:", receipt.gasUsed.toString());
            expect(receipt.gasUsed.gt(0)).to.be.true;
        });
    });
});