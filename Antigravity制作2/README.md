# Free Media Search Extension

Pexels + Pixabay のフリー素材を検索してダウンロードできる Chrome 拡張機能です。

## セットアップ

### 1. Chrome拡張の読み込み

1. Chrome で `chrome://extensions` を開く
2. 右上の「デベロッパーモード」をON
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. このフォルダを選択

### 2. APIキーの設定

インストール後、**オプション画面**でAPIキーを入力してください。

1. `chrome://extensions` で本拡張の「詳細」を開く
2. 「拡張機能のオプション」をクリック（または拡張アイコン右クリック →「オプション」）
3. Pexels API Key と Pixabay API Key を入力して「Save」

> **APIキーはユーザー自身で取得してください。**  
> 本拡張に開発者のAPIキーは含まれていません。

#### APIキーの取得先

- **Pexels**: https://www.pexels.com/api/  
  アカウント作成後、無料でAPIキーを取得できます。
- **Pixabay**: https://pixabay.com/api/docs/  
  アカウント作成後、APIキーが発行されます。

## 使い方

1. Chrome ツールバーの拡張アイコンをクリック
2. 検索ボックスにキーワードを入力して Enter or 「Search」ボタン
3. **Images** / **Videos** タブで切り替え
4. カードの **Source** でオリジナルページを開く
5. カードの **Download** でファイルを保存

> APIキーが未設定の場合、ポップアップに設定画面への案内が表示されます。

## 機能

- Pexels + Pixabay を同時検索
- 最大 40 件表示（各サイト 20 件）
- 画像クリックでプレビュー
- ダウンロードファイル名に `source_keyword_id` を自動付与

## ファイル構成

```
├── manifest.json          # 拡張設定（Manifest V3）
├── popup.html             # ポップアップ画面
├── popup.css              # スタイル
├── popup.js               # メインロジック
├── background.js          # ダウンロード処理
├── options.html           # APIキー設定画面
├── options.js             # 設定画面ロジック
├── icons/                 # アイコン画像
└── README.md              # このファイル
```

## 注意事項

- APIキーはコードやファイルに直書きしないでください
- APIキーは `chrome.storage.local` に保存され、端末内のブラウザにのみ保持されます
- 各 API にはレート制限があります
