import 'dart:convert';
import 'package:http/http.dart' as http;

class AIService {
  // Replace this after your backend is deployed.
  static const String baseUrl = 'https://nova-ai-production-f92f.up.railway.app';

  static Future<AIResponse> sendMessage({
    required String message,
    required String provider,
    String? previousResponseId,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/chat'),
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'message': message,
        'provider': provider,
        if (previousResponseId != null)
          'previousResponseId': previousResponseId,
      }),
    );

    final data = jsonDecode(response.body);

    if (response.statusCode != 200 || data['success'] != true) {
      throw Exception(
        data['error'] ?? 'Nova AI could not process your request.',
      );
    }

    return AIResponse(
      text: data['response'] ?? '',
      responseId: data['responseId'],
    );
  }
}

class AIResponse {
  final String text;
  final String? responseId;

  AIResponse({
    required this.text,
    this.responseId,
  });
}
