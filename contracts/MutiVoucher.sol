// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

// import "./utils/ownable.sol";

contract MutiVoucher {
    struct Voucher {
        uint256 conversionRate; // exchange rate with ETH
        mapping(address => uint256) balances;
    }
    bytes32[] private voucherNames;
    mapping(bytes32 => Voucher) private vouchers;

    event VoucherCreated(bytes32 voucherName, uint256 conversionRate);
    event VoucherPurchased(address buyer, bytes32 voucherName, uint256 amount);
    event VoucherUsed(address user, bytes32 voucherName, uint256 amount);

    // Create new voucher and store in vouchers
    function createVoucher(
        bytes32 name,
        uint256 conversionRate
    ) external {
        require(
            conversionRate > 0,
            "Conversion rate must be greater than zero"
        );
        require(vouchers[name].conversionRate == 0, "Voucher already exist");

        // Create new voucher
        Voucher storage newVoucher = vouchers[name];
        newVoucher.conversionRate = conversionRate;
        voucherNames.push(name);

        emit VoucherCreated(name, conversionRate);
    }

    function getVoucherInfo(
        bytes32 name
    ) external view returns (uint256 conversionRate) {
        require(vouchers[name].conversionRate > 0, "Voucher doesn't exist");
        return vouchers[name].conversionRate;
    }

    function buy(bytes32 name) external payable {
        require(vouchers[name].conversionRate > 0, "Voucher doesn't exist");
        require(msg.value > 0, "Message value must be greater than zero");
        // Attention the unit of value is wei
        uint256 expectedAmount = msg.value * vouchers[name].conversionRate;
        vouchers[name].balances[msg.sender] += expectedAmount;
        emit VoucherPurchased(msg.sender, name, expectedAmount);
    }

    function use(bytes32 name, uint256 amount) external {
        require(vouchers[name].conversionRate > 0, "Voucher doesn't exist");
        require(amount > 0, "Amount must be greater than zero");
        require(
            vouchers[name].balances[msg.sender] >= amount,
            "Insufficient balance"
        );

        // Reduce balance
        vouchers[name].balances[msg.sender] -= amount;
        emit VoucherUsed(msg.sender, name, amount);
    }

    // Query balance of an address in voucher
    function balanceOf(
        bytes32 name,
        address user
    ) external view returns (uint256) {
        require(vouchers[name].conversionRate > 0, "Voucher doesn't exist");
        return vouchers[name].balances[user];
    }

    function getAllVouchers() external view returns (bytes32[] memory) {
        return voucherNames;
    }
}
