// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CeresSoft7} from "../src/CeresSoft7.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 a) external { _mint(to, a); }
}

contract CeresSoft7Test is Test {
    address constant OWNER = 0xe53bdb2118585d5B2cD06a117d3A036AFA70677a;
    uint256 constant USDC_PRICE = 77_000_000; // 77 USDC (6 decimals)
    uint256 constant ETH_PRICE = 0.031 ether;
    string constant BASE = "https://tigerwillca.github.io/ceres/meta/";
    string constant CURI = "https://tigerwillca.github.io/ceres/meta/collection.json";

    MockUSDC usdc;
    address[8] users;
    bytes32[8] leaves;
    bytes32 root8;

    function setUp() public {
        usdc = new MockUSDC();
        for (uint256 i; i < 8; i++) {
            users[i] = address(uint160(0x1000 + i));
            leaves[i] = keccak256(abi.encodePacked(users[i]));
            vm.deal(users[i], 1 ether);
            usdc.mint(users[i], 1_000_000_000);
        }
        root8 = _root(leaves);
    }

    // ── tiny sorted-pair Merkle helpers (8 leaves, balanced) ──
    function _h(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }
    function _root(bytes32[8] memory l) internal pure returns (bytes32) {
        bytes32[4] memory a; bytes32[2] memory b;
        for (uint256 i; i < 4; i++) a[i] = _h(l[2 * i], l[2 * i + 1]);
        for (uint256 i; i < 2; i++) b[i] = _h(a[2 * i], a[2 * i + 1]);
        return _h(b[0], b[1]);
    }
    function _proof(uint256 idx) internal view returns (bytes32[] memory p) {
        bytes32[4] memory a;
        for (uint256 i; i < 4; i++) a[i] = _h(leaves[2 * i], leaves[2 * i + 1]);
        p = new bytes32[](3);
        p[0] = leaves[idx ^ 1];
        p[1] = a[(idx / 2) ^ 1];
        uint256 g = idx / 4;
        p[2] = g == 0 ? _h(a[2], a[3]) : _h(a[0], a[1]);
    }

    function _deploy(address token, uint256 price, bytes32 root) internal returns (CeresSoft7 c) {
        vm.prank(OWNER);
        c = new CeresSoft7(token, price, root, BASE, CURI);
    }
    function _open(CeresSoft7 c) internal { vm.prank(OWNER); c.openMint(0); }
    function _mintEth(CeresSoft7 c, uint256 i) internal {
        bytes32[] memory p = _proof(i);
        vm.prank(users[i]);
        c.mint{value: ETH_PRICE}(p);
    }
    function _mintUsdc(CeresSoft7 c, uint256 i) internal {
        bytes32[] memory p = _proof(i);
        vm.startPrank(users[i]);
        usdc.approve(address(c), USDC_PRICE);
        c.mint(p);
        vm.stopPrank();
    }

    // ── constructor / identity ──
    function test_ConstructorValues() public {
        CeresSoft7 c = _deploy(address(usdc), USDC_PRICE, root8);
        assertEq(c.name(), "Ceres: Soft7");
        assertEq(c.symbol(), "CERES7");
        assertEq(c.owner(), OWNER);
        assertEq(c.MAX_SUPPLY(), 7);
        assertEq(c.MAX_PER_WALLET(), 1);
        assertEq(c.MINT_WINDOW(), 48 hours);
        assertEq(c.paymentToken(), address(usdc));
        assertEq(c.price(), USDC_PRICE);
        assertEq(c.merkleRoot(), root8);
        assertEq(c.contractURI(), CURI);
        assertEq(c.mintStart(), 0);
        (address r, uint256 amt) = c.royaltyInfo(1, 10000);
        assertEq(r, OWNER); assertEq(amt, 750);
        assertTrue(c.supportsInterface(0x80ac58cd)); // ERC721
        assertTrue(c.supportsInterface(0x2a55205a)); // ERC2981
        assertTrue(c.supportsInterface(0x49064906)); // ERC4906
    }
    function test_OwnerIsAlways677A_EvenFromOtherDeployer() public {
        vm.prank(address(0xBEEF));
        CeresSoft7 c = new CeresSoft7(address(0), ETH_PRICE, root8, BASE, CURI);
        assertEq(c.owner(), OWNER);
        vm.prank(address(0xBEEF));
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(0xBEEF)));
        c.withdraw();
    }
    function test_DeployViaCreate2ProxyOwnerIs677A() public {
        address F = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
        // Arachnid deterministic deployment proxy runtime code
        vm.etch(F, hex"7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3");
        bytes32 salt = keccak256("Ceres: Soft7 v1");
        bytes memory init = abi.encodePacked(type(CeresSoft7).creationCode, abi.encode(address(0), ETH_PRICE, root8, BASE, CURI));
        address predicted = address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), F, salt, keccak256(init))))));
        vm.prank(OWNER);
        (bool ok, bytes memory ret) = F.call(abi.encodePacked(salt, init));
        assertTrue(ok);
        assertEq(address(bytes20(ret)), predicted);
        CeresSoft7 c = CeresSoft7(predicted);
        assertEq(c.owner(), OWNER);
        assertEq(c.name(), "Ceres: Soft7");
        assertEq(c.price(), ETH_PRICE);
        vm.prank(OWNER);
        c.openMint(0);
        _mintEth(c, 0);
        uint256 b = OWNER.balance;
        vm.prank(OWNER);
        c.withdraw();
        assertEq(OWNER.balance - b, ETH_PRICE);
    }
    function test_RejectZeroPriceZeroRootEoaToken() public {
        vm.startPrank(OWNER);
        vm.expectRevert(CeresSoft7.BadParam.selector);
        new CeresSoft7(address(0), 0, root8, BASE, CURI);
        vm.expectRevert(CeresSoft7.BadParam.selector);
        new CeresSoft7(address(0), ETH_PRICE, bytes32(0), BASE, CURI);
        vm.expectRevert(CeresSoft7.BadParam.selector);
        new CeresSoft7(address(0x1234), USDC_PRICE, root8, BASE, CURI); // token with no code
        vm.stopPrank();
    }

    // ── window ──
    function test_MintClosedBeforeOpen() public {
        CeresSoft7 c = _deploy(address(0), ETH_PRICE, root8);
        bytes32[] memory p = _proof(0);
        vm.prank(users[0]);
        vm.expectRevert(CeresSoft7.MintNotActive.selector);
        c.mint{value: ETH_PRICE}(p);
    }
    function test_OpenNowWindow48h() public {
        CeresSoft7 c = _deploy(address(0), ETH_PRICE, root8);
        _open(c);
        assertEq(c.mintStart(), block.timestamp);
        assertEq(c.mintEnd(), block.timestamp + 48 hours);
        assertTrue(c.mintActive());
        vm.warp(block.timestamp + 48 hours - 1);
        _mintEth(c, 0);
        vm.warp(block.timestamp + 1); // exactly mintEnd -> closed
        bytes32[] memory p = _proof(1);
        vm.prank(users[1]);
        vm.expectRevert(CeresSoft7.MintNotActive.selector);
        c.mint{value: ETH_PRICE}(p);
        assertFalse(c.mintActive());
    }
    function test_OpenFutureStart() public {
        CeresSoft7 c = _deploy(address(0), ETH_PRICE, root8);
        uint256 s = block.timestamp + 1 hours;
        vm.prank(OWNER); c.openMint(s);
        bytes32[] memory p = _proof(0);
        vm.prank(users[0]);
        vm.expectRevert(CeresSoft7.MintNotActive.selector);
        c.mint{value: ETH_PRICE}(p);
        vm.warp(s);
        _mintEth(c, 0);
        assertEq(c.mintEnd(), s + 48 hours);
    }
    function test_OpenOnlyOnceOnlyOwnerSaneTime() public {
        CeresSoft7 c = _deploy(address(0), ETH_PRICE, root8);
        vm.prank(users[0]);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, users[0]));
        c.openMint(0);
        vm.warp(1_800_000_000);
        vm.startPrank(OWNER);
        vm.expectRevert(CeresSoft7.BadParam.selector);
        c.openMint(block.timestamp - 1);
        vm.expectRevert(CeresSoft7.BadParam.selector);
        c.openMint(block.timestamp + 31 days);
        c.openMint(0);
        vm.expectRevert(CeresSoft7.AlreadyOpened.selector);
        c.openMint(0);
        vm.stopPrank();
    }

    // ── allowlist ──
    function test_MerkleRejectsNonListedAndWrongProof() public {
        CeresSoft7 c = _deploy(address(0), ETH_PRICE, root8);
        _open(c);
        address stranger = address(0xDEAD);
        vm.deal(stranger, 1 ether);
        bytes32[] memory p = _proof(0);
        vm.prank(stranger);
        vm.expectRevert(CeresSoft7.NotAllowlisted.selector);
        c.mint{value: ETH_PRICE}(p);
        bytes32[] memory wrong = _proof(2); // proof for someone else
        vm.prank(users[0]);
        vm.expectRevert(CeresSoft7.NotAllowlisted.selector);
        c.mint{value: ETH_PRICE}(wrong);
        bytes32[] memory empty = new bytes32[](0);
        vm.prank(users[0]);
        vm.expectRevert(CeresSoft7.NotAllowlisted.selector);
        c.mint{value: ETH_PRICE}(empty);
    }
    function test_RealAllowlistRootAndProofs() public {
        string memory j = vm.readFile("test/vectors.json");
        bytes32 root = vm.parseJsonBytes32(j, ".root");
        assertEq(root, 0x34fdf985d5d08c183cf05782375eccff36aa8445822d26e9d869c751d416ea86);
        CeresSoft7 c = _deploy(address(0), ETH_PRICE, root);
        bytes32[] memory pOwner = vm.parseJsonBytes32Array(j, ".vectors.0xe53bdb2118585d5b2cd06a117d3a036afa70677a");
        assertTrue(c.isAllowlisted(OWNER, pOwner));
        assertFalse(c.isAllowlisted(address(0xDEAD), pOwner));
        // the real proof mints for the owner wallet (which is on the list)
        _open(c);
        vm.deal(OWNER, 1 ether);
        vm.prank(OWNER);
        c.mint{value: ETH_PRICE}(pOwner);
        assertEq(c.ownerOf(1), OWNER);
    }

    // ── price ──
    function test_EthPriceExact() public {
        CeresSoft7 c = _deploy(address(0), ETH_PRICE, root8);
        _open(c);
        bytes32[] memory p = _proof(0);
        vm.startPrank(users[0]);
        vm.expectRevert(CeresSoft7.WrongPayment.selector);
        c.mint{value: ETH_PRICE - 1}(p);
        vm.expectRevert(CeresSoft7.WrongPayment.selector);
        c.mint{value: ETH_PRICE + 1}(p);
        c.mint{value: ETH_PRICE}(p);
        vm.stopPrank();
        assertEq(address(c).balance, ETH_PRICE);
    }
    function test_UsdcPricePulled() public {
        CeresSoft7 c = _deploy(address(usdc), USDC_PRICE, root8);
        _open(c);
        bytes32[] memory p = _proof(0);
        vm.startPrank(users[0]);
        vm.expectRevert(); // no approval
        c.mint(p);
        usdc.approve(address(c), USDC_PRICE);
        vm.expectRevert(CeresSoft7.WrongPayment.selector); // ETH sent in token mode
        c.mint{value: 1}(p);
        uint256 before = usdc.balanceOf(users[0]);
        c.mint(p);
        vm.stopPrank();
        assertEq(usdc.balanceOf(address(c)), USDC_PRICE);
        assertEq(before - usdc.balanceOf(users[0]), USDC_PRICE);
    }
    function test_SetPriceAndRootOnlyBeforeOpen() public {
        CeresSoft7 c = _deploy(address(0), ETH_PRICE, root8);
        vm.prank(users[0]);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, users[0]));
        c.setPrice(1);
        vm.startPrank(OWNER);
        c.setPrice(0.03 ether);
        assertEq(c.price(), 0.03 ether);
        c.setMerkleRoot(bytes32(uint256(1)));
        c.setMerkleRoot(root8);
        c.openMint(0);
        vm.expectRevert(CeresSoft7.AlreadyOpened.selector);
        c.setPrice(1 ether);
        vm.expectRevert(CeresSoft7.AlreadyOpened.selector);
        c.setMerkleRoot(bytes32(uint256(2)));
        vm.stopPrank();
    }

    // ── per wallet / supply ──
    function test_OnePerWallet() public {
        CeresSoft7 c = _deploy(address(0), ETH_PRICE, root8);
        _open(c);
        _mintEth(c, 3);
        bytes32[] memory p = _proof(3);
        vm.prank(users[3]);
        vm.expectRevert(CeresSoft7.WalletLimit.selector);
        c.mint{value: ETH_PRICE}(p);
        // transferring away does not reset the limit
        vm.prank(users[3]);
        c.transferFrom(users[3], address(0xCAFE), 1);
        vm.prank(users[3]);
        vm.expectRevert(CeresSoft7.WalletLimit.selector);
        c.mint{value: ETH_PRICE}(p);
    }
    function test_SupplyCapSeven() public {
        CeresSoft7 c = _deploy(address(usdc), USDC_PRICE, root8);
        _open(c);
        for (uint256 i; i < 7; i++) _mintUsdc(c, i);
        assertEq(c.totalSupply(), 7);
        assertEq(c.ownerOf(7), users[6]);
        assertFalse(c.mintActive());
        bytes32[] memory p = _proof(7);
        vm.startPrank(users[7]);
        usdc.approve(address(c), USDC_PRICE);
        vm.expectRevert(CeresSoft7.SoldOut.selector);
        c.mint(p);
        vm.stopPrank();
        vm.expectRevert(); // token 8 never exists
        c.ownerOf(8);
        assertEq(usdc.balanceOf(address(c)), 7 * USDC_PRICE);
    }

    // ── withdraw ──
    function test_WithdrawOnlyOwnerEth() public {
        CeresSoft7 c = _deploy(address(0), ETH_PRICE, root8);
        _open(c);
        _mintEth(c, 0); _mintEth(c, 1);
        vm.prank(users[0]);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, users[0]));
        c.withdraw();
        uint256 b = OWNER.balance;
        vm.prank(OWNER);
        c.withdraw();
        assertEq(OWNER.balance - b, 2 * ETH_PRICE);
        assertEq(address(c).balance, 0);
    }
    function test_WithdrawOnlyOwnerUsdc() public {
        CeresSoft7 c = _deploy(address(usdc), USDC_PRICE, root8);
        _open(c);
        _mintUsdc(c, 0); _mintUsdc(c, 1); _mintUsdc(c, 2);
        vm.prank(users[1]);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, users[1]));
        c.withdraw();
        vm.prank(users[1]);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, users[1]));
        c.withdrawToken(address(usdc));
        vm.prank(OWNER);
        c.withdraw();
        assertEq(usdc.balanceOf(OWNER), 3 * USDC_PRICE);
        assertEq(usdc.balanceOf(address(c)), 0);
    }

    // ── metadata ──
    function test_TokenURIAndFreeze() public {
        CeresSoft7 c = _deploy(address(0), ETH_PRICE, root8);
        _open(c);
        _mintEth(c, 0);
        assertEq(c.tokenURI(1), "https://tigerwillca.github.io/ceres/meta/1.json");
        vm.expectRevert();
        c.tokenURI(2);
        vm.startPrank(OWNER);
        c.setBaseURI("ipfs://x/");
        assertEq(c.tokenURI(1), "ipfs://x/1.json");
        c.freezeMetadata();
        vm.expectRevert(CeresSoft7.MetadataIsFrozen.selector);
        c.setBaseURI("ipfs://y/");
        vm.stopPrank();
        vm.prank(users[0]);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, users[0]));
        c.setContractURI("x");
    }
}
