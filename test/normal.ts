
import { utils } from "ethers";


function main(){
    const name="Hello world";
    let nameU8 = new TextEncoder().encode(name);
    // console.log(nameU8);

    const encoded = utils.defaultAbiCoder.encode(["string"], [name]);
    console.log(encoded);
}

main();