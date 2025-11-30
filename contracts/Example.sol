// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Example {
    uint256 public value;

    constructor(uint256 _value) {
        value = _value;
    }

    function setValue(uint256 _value) external {
        value = _value;
    }

    function getValue() external view returns (uint256) {
        return value;
    }   
}


contract Example2{
    string public name;

    constructor() {
        name = "Hello World!";
    }

    function setName(string calldata _name)  public {
        name = _name;
    }

    function getName() public view returns (string memory){
        return name;
    }
}