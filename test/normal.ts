
import { utils } from "ethers";


function main(){
    const name = "InvalidTickLower()";
    const selector = utils.id(name).substring(0, 10) 
    console.log("%s abi encode:%s",name,selector);
 
    // const encoded = utils.defaultAbiCoder.encode(["string"], [name]);
    // console.log(encoded);
}

main();