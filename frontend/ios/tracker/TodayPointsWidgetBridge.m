#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(TodayPointsWidget, NSObject)
RCT_EXTERN_METHOD(setTodayPoints:(nonnull NSNumber *)points)
RCT_EXTERN_METHOD(setThemeButton:(NSString *)button
                  background:(NSString *)background)
@end
