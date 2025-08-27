import React from 'react';

// パフォーマンス監視クラス
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];

  private constructor() {
    this.initializeObservers();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // パフォーマンスオブザーバーを初期化
  private initializeObservers(): void {
    if ('PerformanceObserver' in window) {
      // ナビゲーションタイミングの監視
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'navigation') {
              this.recordMetric('navigation', entry.duration);
            }
          });
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      } catch (error) {
        console.warn('Navigation timing observer not supported');
      }

      // リソースタイミングの監視
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'resource') {
              this.recordMetric('resource', entry.duration);
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource timing observer not supported');
      }
    }
  }

  // メトリクスを記録
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  // メトリクスの統計を取得
  getMetricStats(name: string): { min: number; max: number; avg: number; count: number } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return null;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

    return { min, max, avg, count: values.length };
  }

  // すべてのメトリクスを取得
  getAllMetrics(): { [key: string]: number[] } {
    const result: { [key: string]: number[] } = {};
    this.metrics.forEach((values, key) => {
      result[key] = [...values];
    });
    return result;
  }

  // メトリクスをクリア
  clearMetrics(): void {
    this.metrics.clear();
  }

  // オブザーバーを破棄
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// デバウンス関数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// スロットル関数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// メモ化関数
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  resolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// 遅延読み込み用のIntersection Observer
export class LazyLoader {
  private observer: IntersectionObserver | null = null;
  private elements: Map<Element, () => void> = new Map();

  constructor(options: IntersectionObserverInit = {}) {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const callback = this.elements.get(entry.target);
            if (callback) {
              callback();
              this.observer?.unobserve(entry.target);
              this.elements.delete(entry.target);
            }
          }
        });
      }, options);
    }
  }

  observe(element: Element, callback: () => void): void {
    if (this.observer) {
      this.elements.set(element, callback);
      this.observer.observe(element);
    } else {
      // Intersection Observerがサポートされていない場合は即座に実行
      callback();
    }
  }

  unobserve(element: Element): void {
    this.observer?.unobserve(element);
    this.elements.delete(element);
  }

  disconnect(): void {
    this.observer?.disconnect();
    this.elements.clear();
  }
}

// 仮想スクロール用のユーティリティ
export class VirtualScroller {
  private container: HTMLElement;
  private itemHeight: number;
  private totalItems: number;
  private visibleItems: number;
  private scrollTop: number = 0;

  constructor(
    container: HTMLElement,
    itemHeight: number,
    totalItems: number,
    visibleItems: number
  ) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.totalItems = totalItems;
    this.visibleItems = visibleItems;
    
    this.container.style.height = `${totalItems * itemHeight}px`;
    this.container.style.position = 'relative';
    this.container.style.overflow = 'auto';
    
    this.container.addEventListener('scroll', this.handleScroll.bind(this));
  }

  private handleScroll(): void {
    this.scrollTop = this.container.scrollTop;
    this.updateVisibleRange();
  }

  private updateVisibleRange(): void {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.min(startIndex + this.visibleItems, this.totalItems);
    
    // ここで表示範囲のアイテムを更新する処理を実装
    this.onRangeChange?.(startIndex, endIndex);
  }

  onRangeChange?: (startIndex: number, endIndex: number) => void;

  destroy(): void {
    this.container.removeEventListener('scroll', this.handleScroll.bind(this));
  }
}

// 画像の遅延読み込み
export function lazyLoadImage(img: HTMLImageElement, src: string): void {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        img.src = src;
        observer.unobserve(img);
      }
    });
  });

  observer.observe(img);
}

// コンポーネントの遅延読み込み
export function lazyLoadComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(importFunc);
}

// パフォーマンス測定用のデコレーター
export function measurePerformance<T extends (...args: any[]) => any>(
  target: any,
  propertyName: string,
  descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> {
  const method = descriptor.value!;

  descriptor.value = ((...args: Parameters<T>) => {
    const start = performance.now();
    const result = method.apply(target, args);
    const end = performance.now();
    
    PerformanceMonitor.getInstance().recordMetric(
      `${target.constructor.name}.${propertyName}`,
      end - start
    );
    
    return result;
  }) as T;

  return descriptor;
}

// パフォーマンス測定用のフック
export function usePerformanceMeasure(name: string) {
  const startTime = React.useRef<number>(0);
  
  const startMeasure = React.useCallback(() => {
    startTime.current = performance.now();
  }, []);
  
  const endMeasure = React.useCallback(() => {
    const endTime = performance.now();
    const duration = endTime - startTime.current;
    PerformanceMonitor.getInstance().recordMetric(name, duration);
  }, [name]);
  
  return { startMeasure, endMeasure };
}

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

// バッチ更新用のユーティリティ
export class BatchUpdater {
  private updates: (() => void)[] = [];
  private scheduled = false;

  schedule(update: () => void): void {
    this.updates.push(update);
    
    if (!this.scheduled) {
      this.scheduled = true;
      requestAnimationFrame(() => {
        this.flush();
      });
    }
  }

  private flush(): void {
    const updates = [...this.updates];
    this.updates = [];
    this.scheduled = false;
    
    updates.forEach(update => update());
  }
}

// グローバルなバッチアップデーター
export const globalBatchUpdater = new BatchUpdater();

// パフォーマンス最適化用のReact.memoラッパー
export function optimizedMemo<T extends React.ComponentType<any>>(
  Component: T,
  propsAreEqual?: (prevProps: Readonly<React.ComponentProps<T>>, nextProps: Readonly<React.ComponentProps<T>>) => boolean
) {
  return React.memo(Component, propsAreEqual);
}

// パフォーマンス監視の開始
export function startPerformanceMonitoring(): void {
  const monitor = PerformanceMonitor.getInstance();
  
  // ページロード時間の測定
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      monitor.recordMetric('domContentLoaded', performance.now());
    });
  }
  
  window.addEventListener('load', () => {
    monitor.recordMetric('pageLoad', performance.now());
  });
}

// パフォーマンスレポートの生成
export function generatePerformanceReport(): {
  metrics: { [key: string]: { min: number; max: number; avg: number; count: number } };
  recommendations: string[];
} {
  const monitor = PerformanceMonitor.getInstance();
  const allMetrics = monitor.getAllMetrics();
  const recommendations: string[] = [];
  
  const metrics: { [key: string]: { min: number; max: number; avg: number; count: number } } = {};
  
  Object.keys(allMetrics).forEach(key => {
    const stats = monitor.getMetricStats(key);
    if (stats) {
      metrics[key] = stats;
      
      // パフォーマンス推奨事項の生成
      if (key === 'navigation' && stats.avg > 3000) {
        recommendations.push('ページロード時間が3秒を超えています。最適化を検討してください。');
      }
      
      if (key === 'resource' && stats.avg > 1000) {
        recommendations.push('リソース読み込み時間が1秒を超えています。画像の最適化を検討してください。');
      }
    }
  });
  
  return { metrics, recommendations };
}
