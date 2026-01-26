// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

// import "./utils/ownable.sol";

contract MutiVoucher {
    struct Voucher {
        uint256 conversionRate; // exchange rate with ETH
        mapping(address => uint256) balances;
    }
    string[] private voucherNames;
    mapping(string => Voucher) private vouchers;

    event VoucherCreated(string voucherName, uint256 conversionRate);
    event VoucherPurchased(address buyer, string voucherName, uint256 amount);
    event VoucherUsed(address user, string voucherName, uint256 amount);

    // Create new voucher and store in vouchers
    function createVoucher(
        string memory name,
        uint256 conversionRate
    ) external {
        require(
            conversionRate > 0,
            "Conversion rate must be greater than zero"
        );
        require(bytes(name).length > 0, "Voucher name cannot be empty");
        require(bytes(name).length <= 10, "Voucher name length up to 10 ");
        require(vouchers[name].conversionRate == 0, "Voucher already exist");

        // Create new voucher
        Voucher storage newVoucher = vouchers[name];
        newVoucher.conversionRate = conversionRate;
        voucherNames.push(name);

        emit VoucherCreated(name, conversionRate);
    }

    function getVoucherInfo(
        string memory name
    ) external view returns (uint256 conversionRate) {
        require(vouchers[name].conversionRate > 0, "Voucher doesn't exist");
        return vouchers[name].conversionRate;
    }

    function buy(string memory name) external payable {
        require(vouchers[name].conversionRate > 0, "Voucher doesn't exist");
        require(msg.value > 0, "Message value must be greater than zero");
        // Attention the unit of value is wei
        uint256 expectedAmount = msg.value * vouchers[name].conversionRate;
        vouchers[name].balances[msg.sender] += expectedAmount;
        emit VoucherPurchased(msg.sender, name, expectedAmount);
    }

    function use(string memory name, uint256 amount) external {
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
        string memory name,
        address user
    ) external view returns (uint256) {
        require(vouchers[name].conversionRate > 0, "Voucher doesn't exist");
        return vouchers[name].balances[user];
    }

    function getAllVouchers() external view returns (string[] memory) {
        return voucherNames;
    }
}
