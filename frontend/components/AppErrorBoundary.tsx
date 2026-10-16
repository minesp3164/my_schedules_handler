import { Component, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { t } from '@/services/i18n';

type Props = { children: ReactNode };
type State = { error: Error | null };

// 렌더 예외로 앱 전체가 죽지 않도록 라우트(Stack) 바깥에서 감싼다.
// 각 화면의 오류는 LoadState.ErrorRetry가, 여기는 "화면 자체를 그리지 못한 경우"만 담당한다.
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // 로컬 로그만 남긴다. 원격 로깅 도입 시 여기에 연결한다.
    console.warn('[AppErrorBoundary]', error.message);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View accessibilityRole="alert" className="flex-1 items-center justify-center bg-screen px-8">
        <Text className="text-base font-bold text-ink">{t('common.errorTitle')}</Text>
        <Text className="mt-3 text-center text-[13px] leading-5 text-meta">
          {t('common.errorBody')}
        </Text>
        <Pressable
          onPress={this.reset}
          accessibilityRole="button"
          accessibilityLabel={t('common.retry')}
          className="mt-6 min-h-12 items-center justify-center rounded-2xl bg-ink px-8">
          <Text className="text-sm font-bold text-white">{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }
}
