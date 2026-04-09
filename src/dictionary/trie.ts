class TrieNode {
    children: Map<string, TrieNode> = new Map();
    isEndOfWord: boolean = false;
}

export class Trie {
    private root: TrieNode = new TrieNode();

    insert(word: string): void {
        let node = this.root;
        for (const ch of word) {
            let next = node.children.get(ch);
            if (!next) {
                next = new TrieNode();
                node.children.set(ch, next);
            }
            node = next;
        }
        node.isEndOfWord = true;
    }

    has(word: string): boolean {
        let node = this.root;
        for (const ch of word) {
            const next = node.children.get(ch);
            if (!next) return false;
            node = next;
        }
        return node.isEndOfWord;
    }

    hasPrefix(prefix: string): boolean {
        let node = this.root;
        for (const ch of prefix) {
            const next = node.children.get(ch);
            if (!next) return false;
            node = next;
        }
        return true;
    }
}
