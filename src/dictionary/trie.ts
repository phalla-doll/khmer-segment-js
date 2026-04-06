class TrieNode {
    children: Map<string, TrieNode> = new Map();
    isEndOfWord: boolean = false;
}

export class Trie {
    private root: TrieNode = new TrieNode();

    insert(word: string): void {
        let node = this.root;
        for (const ch of word) {
            if (!node.children.has(ch)) {
                node.children.set(ch, new TrieNode());
            }
            node = node.children.get(ch)!;
        }
        node.isEndOfWord = true;
    }

    has(word: string): boolean {
        let node = this.root;
        for (const ch of word) {
            if (!node.children.has(ch)) return false;
            node = node.children.get(ch)!;
        }
        return node.isEndOfWord;
    }

    hasPrefix(prefix: string): boolean {
        let node = this.root;
        for (const ch of prefix) {
            if (!node.children.has(ch)) return false;
            node = node.children.get(ch)!;
        }
        return true;
    }

    hasSuffix(suffix: string): boolean {
        return this.hasReverse(suffix, this.root);
    }

    private hasReverse(suffix: string, node: TrieNode): boolean {
        if (suffix.length === 0) return node.isEndOfWord;
        const lastChar = suffix[suffix.length - 1];
        for (const [ch, child] of node.children) {
            if (
                ch === lastChar &&
                this.hasReverse(suffix.slice(0, -1), child)
            ) {
                return true;
            }
            if (this.hasReverse(suffix, child)) {
                return true;
            }
        }
        return false;
    }
}
