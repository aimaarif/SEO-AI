import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Did you forget to add the page to the router?
          </p>

          <p className="mt-2 text-xs text-gray-500">
            If you returned from WordPress, please wait while we complete sign-in…
          </p>

          {/* Minimal fallback: if SPA catches /oauth/callback/:clientId, call backend then redirect */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    var m = location.pathname.match(/^\\/oauth\\/callback\\/([^/]+)$/);
                    if (m && m[1]) {
                      var qs = location.search || '';
                      var url = '/oauth/callback/' + encodeURIComponent(m[1]) + qs;
                      fetch(url, { credentials: 'include' })
                        .then(function() { window.location.replace('/approval' + (qs || '')); })
                        .catch(function() { window.location.replace('/approval' + (qs || '')); });
                    }
                  } catch (e) {}
                })();
              `,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
