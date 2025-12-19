// entry file for all the project

import { loadEnv } from "./env";
import { selectAndHello } from "./provider"; 

async function main() { 
    // Load environment variables from .env into process.env, which must be called before accessing any configuration or API keys.
    loadEnv()

    try {

        const result = await selectAndHello();  // wait for the async result that from the model 

        process.stdout.write(JSON.stringify(result , null , 2) + "\n" )  // make the result unchanged, make null as replacer, 2 means 2-space indentation 


     } catch(error) { 
        // incase of any error happens 
        const message = error instanceof Error ? error.message : String(error);
        
        console.error(message);
        
        // Exit the process with a non-zero code to indicate failure.
        process.exit(1);

    }
}

main()