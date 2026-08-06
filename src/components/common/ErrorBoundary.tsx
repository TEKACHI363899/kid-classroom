import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';
import { COLORS } from '../../constants';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React lifecycle:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <AlertTriangle size={48} color={COLORS.danger} />
            </View>
            
            <Text style={styles.title}>Da Co Loi Xay Ra</Text>
            
            <Text style={styles.subtitle}>
              He thong lop hoc gap mot su co nho. Ban vui long thu tai lai trang hoac quay ve trang chu nhe!
            </Text>

            {this.state.error && (
              <View style={styles.errorDetailsContainer}>
                <Text style={styles.errorDetailsHeader}>Chi tiet loi:</Text>
                <Text style={styles.errorMessage} numberOfLines={5}>
                  {this.state.error.toString()}
                </Text>
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={this.handleGoHome}>
                <Home size={18} color={COLORS.primary} style={styles.btnIcon} />
                <Text style={[styles.btnText, { color: COLORS.primary }]}>Ve Trang Chu</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={this.handleReload}>
                <RefreshCw size={18} color={COLORS.white} style={styles.btnIcon} />
                <Text style={[styles.btnText, { color: COLORS.white }]}>Tai Lai Trang</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFE4E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textDark,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    fontWeight: '600',
  },
  errorDetailsContainer: {
    width: '100%',
    backgroundColor: COLORS.gray100,
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
  },
  errorDetailsHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.gray600,
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 13,
    color: COLORS.danger,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  btnOutline: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  btnIcon: {
    marginRight: 8,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
