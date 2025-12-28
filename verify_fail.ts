import { N8NWorkflow } from './shared/types/workflow.types';

// Mock the MergeService functions - UPDATED LOGIC
class MergeServiceMock {
    recursiveReplace(
        target: any,
        predicate: (value: any, key: string | number) => boolean,
        replacer: (value: any, key: string | number) => any,
        keyFilter?: RegExp
    ): number {
        let changes = 0;
        if (Array.isArray(target)) {
            for (let i = 0; i < target.length; i++) {
                if (typeof target[i] === 'object' && target[i] !== null) {
                    changes += this.recursiveReplace(target[i], predicate, replacer, keyFilter);
                } else if (predicate(target[i], i)) {
                    target[i] = replacer(target[i], i);
                    changes++;
                }
            }
        } else if (typeof target === 'object' && target !== null) {
            Object.keys(target).forEach(key => {
                const value = target[key];
                if (predicate(value, key)) {
                    target[key] = replacer(value, key);
                    changes++;
                } else if (typeof value === 'object' && value !== null) {
                     changes += this.recursiveReplace(value, predicate, replacer, keyFilter);
                }
            });
        }
        return changes;
    }

    applyDomainDecisions(
        merged: N8NWorkflow,
        domainDecisions: Record<string, { selected: 'staging' | 'main' | 'custom'; url: string }>
    ): void {
        console.log('[Mock] Applying domain decisions...');
        Object.entries(domainDecisions).forEach(([decisionKey, decision]) => {
            const targetUrl = decision.url;
            console.log(`[Mock] Key: ${decisionKey}`);
            
            // Strategy 2a: Strict
            let replacedCount = this.recursiveReplace(
                merged,
                (val) => typeof val === 'string' && val.includes(decisionKey),
                (val) => val.replace(decisionKey, targetUrl)
            );

            // Strategy 2b: Normalized (The Fix)
            if (replacedCount === 0) {
                const cleanKey = decisionKey.replace(/\s/g, '');
                replacedCount += this.recursiveReplace(
                    merged,
                    (val) => typeof val === 'string' && val.replace(/\s/g, '') === cleanKey,
                    () => targetUrl
                );
            }
            
            if (replacedCount > 0) {
                console.log(`[Mock] Applied ${replacedCount} replacements`);
            } else {
                console.log(`[Mock] FAILED to apply decision`);
            }
        });
    }
}

const KEY_FROM_LOG = "=https://qqjchjafauetffnfdyku.supabase.co/storage/v1/object/sign/consultation-images/{{ $('Get Image Path').item.json.image_path }}";
const TARGET_FROM_LOG = "=https://txnqnxcziftohkypkvth.supabase.co/storage/v1/object/sign/consultation-images/new/{{ $('new Get Image Path').item.json.image_path }}";

// Test Case 2: Whitespace Difference
const wf2: N8NWorkflow = {
    id: "2", name: "Whitespace",
    nodes: [{
        id: "n2", name: "n2", type: "t",
        parameters: { 
            url: "=https://qqjchjafauetffnfdyku.supabase.co/storage/v1/object/sign/consultation-images/{{ $( 'Get Image Path' ).item.json.image_path }}"
        }
    }]
};

const service = new MergeServiceMock();

console.log("\n--- Test 2: Whitespace Mismatch (With Fix) ---");
service.applyDomainDecisions(wf2, { [KEY_FROM_LOG]: { selected: 'custom', url: TARGET_FROM_LOG } });
console.log("Result 2:", wf2.nodes[0].parameters.url === TARGET_FROM_LOG ? "PASS" : "FAIL");
// Use bracket notation to avoid TS error about possibly undefined
console.log("Actual 2:", (wf2.nodes[0].parameters as any).url);