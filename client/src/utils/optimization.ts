import React, { useMemo, useCallback, memo } from 'react';

// メモ化されたセレクター
export function createMemoizedSelector<TState, TResult>(
  selector: (state: TState) => TResult
): (state: TState) => TResult {
  let lastState: TState | null = null;
  let lastResult: TResult | null = null;

  return (state: TState): TResult => {
    if (lastState === state) {
      return lastResult!;
    }

    lastState = state;
    lastResult = selector(state);
    return lastResult;
  };
}

// 最適化されたメモ化コンポーネント
export function optimizedMemo<T extends React.ComponentType<any>>(
  Component: T,
  propsAreEqual?: (prevProps: Readonly<React.ComponentProps<T>>, nextProps: Readonly<React.ComponentProps<T>>) => boolean
): React.MemoExoticComponent<T> {
  return memo(Component, propsAreEqual);
}

// バッチ更新ユーティリティ
export class BatchUpdater {
  private updates: Array<() => void> = [];
  private isScheduled = false;

  schedule(update: () => void): void {
    this.updates.push(update);
    if (!this.isScheduled) {
      this.isScheduled = true;
      requestAnimationFrame(() => {
        this.flush();
      });
    }
  }

  private flush(): void {
    const updates = [...this.updates];
    this.updates = [];
    this.isScheduled = false;

    React.startTransition(() => {
      updates.forEach(update => update());
    });
  }
}

// 仮想スクロール用のアイテム計算
export function calculateVirtualScrollItems<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  scrollTop: number
): { startIndex: number; endIndex: number; visibleItems: T[] } {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  return {
    startIndex,
    endIndex,
    visibleItems: items.slice(startIndex, endIndex)
  };
}

// 遅延読み込み用のIntersection Observer
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  return new IntersectionObserver(callback, {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  });
}

// 画像の遅延読み込み
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
    img.onerror = () => {
      setImageSrc(placeholder || '');
      setIsLoaded(false);
    };
  }, [src, placeholder]);

  return { imageSrc, isLoaded };
}

// データの遅延読み込み
export function useLazyData<T>(
  fetchFn: () => Promise<T>,
  dependencies: React.DependencyList = []
): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  React.useEffect(() => {
    fetchData();
  }, dependencies);

  return { data, loading, error };
}

// パフォーマンス測定デコレーター
export function measurePerformance<T extends (...args: any[]) => any>(
  target: any,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> {
  const method = descriptor.value!;

  descriptor.value = function (this: any, ...args: any[]) {
    const start = performance.now();
    const result = method.apply(this, args);
    const end = performance.now();

    console.log(`${propertyKey} took ${end - start}ms`);

    return result;
  } as T;

  return descriptor;
}

// パフォーマンス測定フック
export function usePerformanceMeasure(name: string) {
  const startTime = useMemo(() => performance.now(), [name]);

  React.useEffect(() => {
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`${name} took ${duration}ms`);
    };
  }, [name, startTime]);
}

// コンポーネントのレンダリング最適化（シンプル版）
export function withPerformanceOptimization<T extends React.ComponentType<any>>(
  Component: T,
  propsAreEqual?: (prevProps: Readonly<React.ComponentProps<T>>, nextProps: Readonly<React.ComponentProps<T>>) => boolean
): React.MemoExoticComponent<T> {
  return memo(Component, propsAreEqual);
}

// リストの最適化（JSXを使用しない版）
export function createOptimizedList<T>(
  items: T[],
  renderItem: (item: T, index: number) => React.ReactNode,
  keyExtractor: (item: T, index: number) => string,
  itemHeight: number,
  containerHeight: number,
  scrollTop: number,
  onScroll: (scrollTop: number) => void
) {
  const { startIndex, endIndex, visibleItems } = useMemo(
    () => calculateVirtualScrollItems(items, itemHeight, containerHeight, scrollTop),
    [items, itemHeight, containerHeight, scrollTop]
  );

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    onScroll(scrollTop);
  }, [onScroll]);

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    startIndex,
    endIndex,
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll
  };
}

// データのキャッシュ管理
export class DataCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; ttl: number }>();

  set(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    return this.cache.has(key) && this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// グローバルキャッシュインスタンス
export const globalCache = new DataCache<any>();

// キャッシュ付きデータ取得フック
export function useCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 5 * 60 * 1000
): { data: T | null; loading: boolean; error: Error | null; refetch: () => void } {
  const [data, setData] = React.useState<T | null>(() => globalCache.get(key));
  const [loading, setLoading] = React.useState(!globalCache.has(key));
  const [error, setError] = React.useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
      globalCache.set(key, result, ttl);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, ttl]);

  React.useEffect(() => {
    if (!globalCache.has(key)) {
      fetchData();
    }
  }, [key, fetchData]);

  const refetch = useCallback(() => {
    globalCache.delete(key);
    fetchData();
  }, [key, fetchData]);

  return { data, loading, error, refetch };
}
