// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Ceres: Soft7 (CERES7)
 * @notice Seven pieces on Robinhood Chain (4663). Allowlist only (Merkle root), one per wallet,
 *         one 48-hour mint window that the owner opens once.
 *
 *  - Owner is hard-wired to 0xe53b…677a, and only that wallet can deploy (constructor check),
 *    so the contract is William's own. No factory, no proxy, no upgrade.
 *  - MAX_SUPPLY 7 (token ids 1..7), MAX_PER_WALLET 1, MINT_WINDOW 48 hours. All constants.
 *  - Currency is a constructor param: paymentToken == address(0) means native ETH (msg.value),
 *    otherwise an ERC-20 pulled with transferFrom (buyer approves first). It can never change.
 *  - Price and Merkle root are constructor params; the owner may correct them only BEFORE the
 *    window is opened. After openMint they are locked.
 *  - Allowlist leaf = keccak256(abi.encodePacked(account)), sorted-pair tree (OpenZeppelin MerkleProof),
 *    same format as the sealed Soft7 allowlist package.
 *  - Mint proceeds stay in the contract; withdraw() is owner-only and pays owner() only.
 *  - ERC-2981 royalty 7.5% to 0xe53b…677a (same as Soft7 777).
 */
contract CeresSoft7 is ERC721, ERC2981, Ownable, ReentrancyGuard {
    using Strings for uint256;
    using SafeERC20 for IERC20;

    address public constant OWNER_WALLET = 0xe53bdb2118585d5B2cD06a117d3A036AFA70677a;
    uint256 public constant MAX_SUPPLY = 7;
    uint256 public constant MAX_PER_WALLET = 1;
    uint256 public constant MINT_WINDOW = 48 hours;
    uint96 public constant ROYALTY_BPS = 750; // 7.5%

    /// @notice address(0) = native ETH; otherwise the ERC-20 used for payment. Immutable.
    address public immutable paymentToken;
    /// @notice price per token in the payment currency's smallest unit (wei, or token base units).
    uint256 public price;
    bytes32 public merkleRoot;

    uint256 public totalMinted; // ids 1..totalMinted
    uint256 public mintStart;   // 0 = window not opened yet
    uint256 public mintEnd;
    bool public metadataFrozen;
    mapping(address => uint256) public mintedBy;

    string private _baseTokenURI;
    string private _contractURI;

    error NotOwnerWallet();
    error BadParam();
    error AlreadyOpened();
    error MintNotActive();
    error SoldOut();
    error WalletLimit();
    error NotAllowlisted();
    error WrongPayment();
    error MetadataIsFrozen();
    error TransferFailed();

    event MintOpened(uint256 start, uint256 end);
    event PriceSet(uint256 price);
    event MerkleRootSet(bytes32 root);
    event Minted(address indexed to, uint256 indexed tokenId, uint256 paid);
    event Withdrawn(address indexed to, address indexed token, uint256 amount);
    event BaseURISet(string baseURI);
    event ContractURISet(string contractURI);
    event MetadataFrozenForever();
    /// @dev ERC-4906
    event MetadataUpdate(uint256 _tokenId);
    event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);

    constructor(
        address paymentToken_,
        uint256 price_,
        bytes32 merkleRoot_,
        string memory baseURI_,
        string memory contractURI_
    ) ERC721("Ceres: Soft7", "CERES7") Ownable(OWNER_WALLET) {
        if (msg.sender != OWNER_WALLET) revert NotOwnerWallet();
        if (price_ == 0 || merkleRoot_ == bytes32(0)) revert BadParam();
        if (paymentToken_ != address(0) && paymentToken_.code.length == 0) revert BadParam();
        paymentToken = paymentToken_;
        price = price_;
        merkleRoot = merkleRoot_;
        _baseTokenURI = baseURI_;
        _contractURI = contractURI_;
        _setDefaultRoyalty(OWNER_WALLET, ROYALTY_BPS);
    }

    // ─── Owner: open the window (one time) ───────────────────────────────────

    /// @notice Opens the 48-hour window. startTime 0 = now; otherwise a future unix time (<= 30 days out).
    function openMint(uint256 startTime) external onlyOwner {
        if (mintStart != 0) revert AlreadyOpened();
        uint256 s = startTime == 0 ? block.timestamp : startTime;
        if (s < block.timestamp || s > block.timestamp + 30 days) revert BadParam();
        mintStart = s;
        mintEnd = s + MINT_WINDOW;
        emit MintOpened(s, s + MINT_WINDOW);
    }

    function setPrice(uint256 price_) external onlyOwner {
        if (mintStart != 0) revert AlreadyOpened();
        if (price_ == 0) revert BadParam();
        price = price_;
        emit PriceSet(price_);
    }

    function setMerkleRoot(bytes32 root) external onlyOwner {
        if (mintStart != 0) revert AlreadyOpened();
        if (root == bytes32(0)) revert BadParam();
        merkleRoot = root;
        emit MerkleRootSet(root);
    }

    // ─── Mint ────────────────────────────────────────────────────────────────

    function isAllowlisted(address account, bytes32[] calldata proof) public view returns (bool) {
        return MerkleProof.verifyCalldata(proof, merkleRoot, keccak256(abi.encodePacked(account)));
    }

    function mintActive() public view returns (bool) {
        return mintStart != 0 && block.timestamp >= mintStart && block.timestamp < mintEnd && totalMinted < MAX_SUPPLY;
    }

    /// @notice Mint 1. ETH mode: send exactly `price` as value. Token mode: approve `price` first, send 0 value.
    function mint(bytes32[] calldata proof) external payable nonReentrant {
        if (mintStart == 0 || block.timestamp < mintStart || block.timestamp >= mintEnd) revert MintNotActive();
        if (totalMinted >= MAX_SUPPLY) revert SoldOut();
        if (mintedBy[msg.sender] >= MAX_PER_WALLET) revert WalletLimit();
        if (!isAllowlisted(msg.sender, proof)) revert NotAllowlisted();
        uint256 p = price;
        if (paymentToken == address(0)) {
            if (msg.value != p) revert WrongPayment();
        } else {
            if (msg.value != 0) revert WrongPayment();
            IERC20 t = IERC20(paymentToken);
            uint256 before = t.balanceOf(address(this));
            t.safeTransferFrom(msg.sender, address(this), p);
            if (t.balanceOf(address(this)) - before != p) revert WrongPayment();
        }
        mintedBy[msg.sender] += 1;
        uint256 id = ++totalMinted;
        _safeMint(msg.sender, id);
        emit Minted(msg.sender, id, p);
    }

    // ─── Proceeds (owner only, to owner only) ────────────────────────────────

    function withdraw() external onlyOwner nonReentrant {
        address to = owner();
        uint256 eth = address(this).balance;
        if (eth > 0) {
            (bool ok,) = payable(to).call{value: eth}("");
            if (!ok) revert TransferFailed();
            emit Withdrawn(to, address(0), eth);
        }
        if (paymentToken != address(0)) {
            uint256 bal = IERC20(paymentToken).balanceOf(address(this));
            if (bal > 0) {
                IERC20(paymentToken).safeTransfer(to, bal);
                emit Withdrawn(to, paymentToken, bal);
            }
        }
    }

    /// @notice Recover any other ERC-20 sent here by mistake (owner only, to owner only).
    function withdrawToken(address token) external onlyOwner nonReentrant {
        uint256 bal = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(owner(), bal);
        emit Withdrawn(owner(), token, bal);
    }

    // ─── Metadata ────────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat(_baseTokenURI, tokenId.toString(), ".json");
    }

    function contractURI() external view returns (string memory) {
        return _contractURI;
    }

    function setBaseURI(string calldata u) external onlyOwner {
        if (metadataFrozen) revert MetadataIsFrozen();
        _baseTokenURI = u;
        emit BaseURISet(u);
        emit BatchMetadataUpdate(1, MAX_SUPPLY);
    }

    function setContractURI(string calldata u) external onlyOwner {
        if (metadataFrozen) revert MetadataIsFrozen();
        _contractURI = u;
        emit ContractURISet(u);
    }

    function freezeMetadata() external onlyOwner {
        metadataFrozen = true;
        emit MetadataFrozenForever();
    }

    function totalSupply() external view returns (uint256) {
        return totalMinted;
    }

    function supportsInterface(bytes4 id) public view override(ERC721, ERC2981) returns (bool) {
        return id == bytes4(0x49064906) || super.supportsInterface(id);
    }
}
