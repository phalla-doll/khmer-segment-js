import { Injectable, Pipe, type PipeTransform } from '@angular/core';
import {
    containsKhmer,
    isKhmerChar,
    isKhmerText,
} from '../core/detect';
import {
    normalizeKhmer,
    normalizeKhmerCluster,
} from '../core/normalize';
import {
    splitClusters,
    countClusters,
    getClusterBoundaries,
} from '../core/cluster';
import { segmentWords } from '../core/segment';
import { getCaretBoundaries, deleteBackward } from '../core/caret';
import { createDictionary } from '../dictionary/create-dictionary';
import type {
    CaretOptions,
    DeleteResult,
    KhmerDictionary,
    SegmentOptions,
    SegmentResult,
} from '../types/public';

@Injectable({
    providedIn: 'root',
})
export class KhmerSegmentService {
    containsKhmer(text: string): boolean {
        return containsKhmer(text);
    }

    isKhmerChar(char: string): boolean {
        return isKhmerChar(char);
    }

    isKhmerText(text: string): boolean {
        return isKhmerText(text);
    }

    normalizeKhmer(text: string): string {
        return normalizeKhmer(text);
    }

    normalizeKhmerCluster(cluster: string): string {
        return normalizeKhmerCluster(cluster);
    }

    splitClusters(text: string): string[] {
        return splitClusters(text);
    }

    countClusters(text: string): number {
        return countClusters(text);
    }

    getClusterBoundaries(text: string): Array<{ start: number; end: number }> {
        return getClusterBoundaries(text);
    }

    segmentWords(text: string, options?: SegmentOptions): SegmentResult {
        return segmentWords(text, options);
    }

    getCaretBoundaries(text: string, options?: CaretOptions): number[] {
        return getCaretBoundaries(text, options);
    }

    deleteBackward(
        text: string,
        cursorIndex: number,
        options?: CaretOptions
    ): DeleteResult {
        return deleteBackward(text, cursorIndex, options);
    }

    createDictionary(
        words: string[],
        frequencies?: Map<string, number>
    ): KhmerDictionary {
        return createDictionary(words, frequencies);
    }
}

@Pipe({
    name: 'khmerNormalize',
    standalone: true,
    pure: true,
})
export class KhmerNormalizePipe implements PipeTransform {
    transform(value: string | null | undefined): string {
        if (value == null) {
            return '';
        }

        return normalizeKhmer(value);
    }
}

export type {
    SegmentOptions,
    SegmentResult,
    KhmerDictionary,
    CaretOptions,
    DeleteResult,
};
